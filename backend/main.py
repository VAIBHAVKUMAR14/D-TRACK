"""
main.py — FastAPI Application for D-TRACK.

OSINT backend that ingests mock social media data, runs NLP intent scoring,
resolves cross-platform identities via wallet stitching, builds a shadow-graph,
and computes risk scores.
"""

import asyncio
import json
import os
import secrets
import sys
import tempfile
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Add parent dir to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.cleaner import clean_text, clean_profile, MAX_BIO_LENGTH, MAX_TEXT_LENGTH
from backend.models import (
    AnalyzeTextRequest, AnalyzeTextResponse, DashboardStats, Profile
)
from backend.nlp_engine import analyze_profile, compute_intent_score
from backend.identity_resolver import (
    resolve_identities, get_cross_platform_links, detect_promotion_links
)
from backend.graph_builder import (
    build_shadow_graph, compute_centrality_metrics,
    graph_to_serializable, generate_pyvis_html, detect_communities
)
from backend.risk_scorer import (
    compute_risk_scores, update_graph_risk_scores, get_risk_leaderboard
)
from backend.stylometry import find_probable_burner_matches


# ── Configuration ────────────────────────────────────────────────────────────

# C2 — Configurable CORS origins (default: only Streamlit)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:8501").split(",")

# C3 — API key authentication
API_KEY = os.getenv("DTRACK_API_KEY", "changeme-replace-in-production")
security = HTTPBearer()

MAX_FAILURES = 3


def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """Verify the bearer token matches the configured API key."""
    if not secrets.compare_digest(credentials.credentials, API_KEY):
        raise HTTPException(status_code=403, detail="Invalid API key")
    return credentials


# ── In-Memory State ─────────────────────────────────────────────────────────
_state = {
    "loaded": False,
    "error": None,           # C5 — track pipeline errors
    "error_count": 0,        # C5 — prevent infinite retry
    "profiles_raw": [],
    "profile_analyses": [],
    "identities": [],
    "graph": None,
    "graph_data": None,
    "graph_html": None,      # M6 — cached PyVis HTML
    "centrality_metrics": {},
    "leaderboard": [],
    "stats": {},
    "metadata": {},
    "burner_leads": [],      # stylometric burner matches
    "communities": {},       # Louvain community detection
}

# C5 — asyncio lock to prevent concurrent pipeline runs
_pipeline_lock = asyncio.Lock()

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "mock_data.json"


# ── C4 — Atomic Write ───────────────────────────────────────────────────────

def atomic_write_json(path: Path, data: dict):
    """Write JSON atomically: write to temp file, then rename.

    Prevents data loss if the process crashes mid-write."""
    dir_path = path.parent
    with tempfile.NamedTemporaryFile(
        mode='w', dir=dir_path, suffix='.tmp',
        delete=False, encoding='utf-8'
    ) as tmp:
        json.dump(data, tmp, indent=2, ensure_ascii=False)
        tmp.flush()
        os.fsync(tmp.fileno())
        tmp_path = tmp.name
    os.replace(tmp_path, str(path))


# ── Pipeline ─────────────────────────────────────────────────────────────────
def run_full_pipeline():
    """Execute the complete D-TRACK analysis pipeline."""

    # C5 — Check failure count before retrying
    if _state["error_count"] >= MAX_FAILURES:
        raise RuntimeError(
            f"Pipeline disabled after {MAX_FAILURES} consecutive failures: "
            f"{_state['error']}"
        )

    # Step 1: Load data
    print("\n" + "=" * 60)
    print("  D-TRACK: Full Analysis Pipeline")
    print("=" * 60)

    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Mock data not found at {DATA_PATH}")

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    _state["metadata"] = dataset.get("metadata", {})
    _state["profiles_raw"] = dataset.get("profiles", [])
    print(f"\n[1/5] Loaded {len(_state['profiles_raw'])} profiles from {DATA_PATH.name}")

    # Step 2: NLP Analysis
    print(f"\n[2/5] Running NLP intent analysis...")
    profile_analyses = []
    for profile in _state["profiles_raw"]:
        analysis = analyze_profile(profile)
        profile_analyses.append(analysis)
    _state["profile_analyses"] = profile_analyses

    total_flagged = sum(pa["flagged_posts"] for pa in profile_analyses)
    total_posts = sum(pa["total_posts"] for pa in profile_analyses)
    print(f"       Analyzed {total_posts} posts, {total_flagged} flagged as suspicious")

    # Step 3: Identity Resolution
    print(f"\n[3/5] Resolving cross-platform identities...")
    identities = resolve_identities(profile_analyses)
    cross_links = get_cross_platform_links(identities)
    promo_links = detect_promotion_links(profile_analyses)
    print(f"       Found {len(cross_links)} cross-platform links, "
          f"{len(promo_links)} promotion links")

    # Step 4: Graph Construction
    print(f"\n[4/5] Building shadow-graph...")
    graph = build_shadow_graph(identities, cross_links, promo_links)
    centrality_metrics = compute_centrality_metrics(graph)
    _state["graph"] = graph
    _state["centrality_metrics"] = centrality_metrics

    # Step 5: Risk Scoring
    print(f"\n[5/7] Computing risk scores...")
    identities = compute_risk_scores(identities, centrality_metrics)
    _state["identities"] = identities

    # Step 6: Community detection
    print(f"\n[6/7] Detecting network communities...")
    communities = detect_communities(graph)
    _state["communities"] = communities

    # Update graph with risk scores AND community IDs
    graph_data = graph_to_serializable(graph, communities=communities)
    graph_data = update_graph_risk_scores(graph_data, identities)
    _state["graph_data"] = graph_data

    # M6 — Cache PyVis HTML
    _state["graph_html"] = generate_pyvis_html(graph)

    # Build leaderboard
    _state["leaderboard"] = get_risk_leaderboard(identities)

    # Step 7: Burner detection (stylometric)
    print(f"\n[7/7] Running stylometric burner detection...")
    burner_leads = find_probable_burner_matches(
        _state["profile_analyses"],
        _state["identities"],
        threshold=0.65,
    )
    _state["burner_leads"] = burner_leads
    print(f"       Found {len(burner_leads)} probable burner matches")

    # Compute stats
    all_wallets = set()
    all_platforms = set()
    for identity in identities:
        all_wallets.update(identity.get("all_wallets", []))
        all_platforms.update(identity.get("platforms", []))

    high_risk = sum(1 for i in identities
                    if i["risk_level"] in ("High", "Critical"))

    community_groups = {}
    for node_id, cid in communities.items():
        community_groups.setdefault(str(cid), []).append(node_id)

    _state["stats"] = {
        "total_profiles": len(profile_analyses),
        "total_posts": total_posts,
        "flagged_profiles": sum(1 for pa in profile_analyses if pa["flagged_posts"] > 0),
        "flagged_posts": total_flagged,
        "unified_identities": len(identities),
        "organized_networks": sum(
            1 for i in identities if len(i.get("profiles", [])) >= 3
        ),
        "wallets_tracked": len(all_wallets),
        "platforms_covered": len(all_platforms),
        "avg_risk_score": round(
            sum(i["risk_score"] for i in identities) / len(identities), 1
        ) if identities else 0.0,
        "high_risk_count": high_risk,
        "total_communities": len(community_groups),
        "burner_leads_count": len(burner_leads),
    }

    _state["loaded"] = True
    # C5 — Reset error state on success
    _state["error"] = None
    _state["error_count"] = 0

    print(f"\n{'=' * 60}")
    print(f"  Pipeline Complete!")
    print(f"  Profiles: {_state['stats']['total_profiles']}")
    print(f"  Identities: {_state['stats']['unified_identities']}")
    print(f"  High-Risk Targets: {high_risk}")
    print(f"  Communities: {len(community_groups)}")
    print(f"  Burner Leads: {len(burner_leads)}")
    print(f"  Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges")
    print(f"{'=' * 60}\n")


# C5 — Thread-safe pipeline execution with asyncio.Lock
async def _run_pipeline_safe():
    """Run the pipeline under lock, off the event loop thread."""
    async with _pipeline_lock:
        await asyncio.to_thread(run_full_pipeline)


async def _ensure_loaded():
    """Ensure data is loaded; run pipeline if not, respecting error limits."""
    if not _state["loaded"]:
        try:
            await _run_pipeline_safe()
        except Exception as e:
            _state["error"] = str(e)
            _state["error_count"] += 1
            raise HTTPException(status_code=500, detail=str(e))


# ── M1 — Lifespan context manager (replaces deprecated @app.on_event) ──────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    try:
        await asyncio.to_thread(run_full_pipeline)
    except Exception as e:
        print(f"[WARN] Auto-load failed: {e}")
        print("[WARN] Data will be loaded on first API call.")
    yield


# ── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="D-TRACK OSINT API",
    description="Cross-platform OSINT tool for de-anonymizing drug traffickers",
    version="1.0.0",
    lifespan=lifespan,
)

# C2 — Restricted CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/api/ingest", dependencies=[Depends(verify_api_key)])
async def ingest_data():
    """Load mock_data.json and run the full D-TRACK pipeline."""
    try:
        await _run_pipeline_safe()
        return {
            "status": "success",
            "message": "Pipeline executed successfully",
            "stats": _state["stats"],
        }
    except Exception as e:
        _state["error"] = str(e)
        _state["error_count"] += 1
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/profiles")
async def get_profiles():
    """Return all analyzed profiles."""
    await _ensure_loaded()
    return {
        "profiles": _state["profile_analyses"],
        "count": len(_state["profile_analyses"]),
    }


@app.get("/api/graph")
async def get_graph():
    """Return graph data (nodes + edges) for visualization."""
    await _ensure_loaded()
    return _state["graph_data"]


@app.get("/api/graph/html", dependencies=[Depends(verify_api_key)])
async def get_graph_html():
    """Return an interactive PyVis HTML visualization."""
    await _ensure_loaded()
    # M6 — Serve cached HTML
    if not _state.get("graph_html"):
        raise HTTPException(status_code=404, detail="Graph not built yet")
    return HTMLResponse(content=_state["graph_html"])


@app.get("/api/risk-scores", dependencies=[Depends(verify_api_key)])
async def get_risk_scores():
    """Return ranked risk leaderboard."""
    await _ensure_loaded()
    return {
        "leaderboard": _state["leaderboard"],
        "count": len(_state["leaderboard"]),
    }


@app.get("/api/identities", dependencies=[Depends(verify_api_key)])
async def get_identities():
    """Return all unified identities."""
    await _ensure_loaded()

    # Return without full post analyses to keep response size reasonable
    safe_identities = []
    for identity in _state["identities"]:
        safe_id = {k: v for k, v in identity.items() if k != "profiles"}
        safe_id["profiles_summary"] = [
            {
                "profile_id": p["profile_id"],
                "username": p["username"],
                "platform": p["platform"],
                "max_intent_score": p["max_intent_score"],
                "flagged_posts": p["flagged_posts"],
            }
            for p in identity.get("profiles", [])
        ]
        safe_identities.append(safe_id)

    return {
        "identities": safe_identities,
        "count": len(safe_identities),
    }


@app.get("/api/identity/{identity_id}", dependencies=[Depends(verify_api_key)])
async def get_identity(identity_id: str):
    """Get detailed info for a specific unified identity."""
    await _ensure_loaded()

    for identity in _state["identities"]:
        if identity["identity_id"] == identity_id:
            return identity

    raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")


@app.post("/api/analyze")
async def analyze_text(request: AnalyzeTextRequest):
    """Analyze a single text string for trafficking intent."""
    result = compute_intent_score(request.text)
    return AnalyzeTextResponse(text=request.text, **result)


# H1 — Pydantic-validated profile ingestion + C4 atomic writes
@app.post("/api/add-profile", dependencies=[Depends(verify_api_key)])
async def add_profile(profile: Profile):
    """
    Add a custom profile and re-run the pipeline.
    Input is validated against the Pydantic Profile model.
    """
    try:
        profile_dict = profile.model_dump()
        profile_dict = clean_profile(profile_dict)  # full cleaning pipeline

        # Append to raw profiles
        _state["profiles_raw"].append(profile_dict)

        # C4 — Atomic write to disk
        dataset = {"metadata": _state["metadata"], "profiles": _state["profiles_raw"]}
        atomic_write_json(DATA_PATH, dataset)

        # H4 — Run pipeline off the event loop
        await _run_pipeline_safe()

        return {
            "status": "success",
            "message": f"Profile {profile_dict['id']} added. Pipeline re-executed.",
            "total_profiles": len(_state["profiles_raw"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        _state["error"] = str(e)
        _state["error_count"] += 1
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/add-profiles-bulk", dependencies=[Depends(verify_api_key)])
async def add_profiles_bulk(data: dict):
    """
    Add multiple custom profiles at once.
    Expects: {"profiles": [profile_dict, ...]}
    Each profile is validated against the Pydantic Profile model.
    """
    try:
        raw_profiles = data.get("profiles", [])
        if not raw_profiles:
            raise HTTPException(status_code=400, detail="No profiles provided")

        # H1 — Validate each profile with Pydantic + full cleaning
        validated = []
        for raw in raw_profiles:
            p = Profile(**raw)
            p_dict = p.model_dump()
            p_dict = clean_profile(p_dict)  # full cleaning pipeline
            validated.append(p_dict)

        _state["profiles_raw"].extend(validated)

        # C4 — Atomic write
        dataset = {"metadata": _state["metadata"], "profiles": _state["profiles_raw"]}
        atomic_write_json(DATA_PATH, dataset)

        # H4 — Run pipeline off the event loop
        await _run_pipeline_safe()

        return {
            "status": "success",
            "message": f"{len(validated)} profiles added. Pipeline re-executed.",
            "total_profiles": len(_state["profiles_raw"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        _state["error"] = str(e)
        _state["error_count"] += 1
        raise HTTPException(status_code=500, detail=str(e))


# L4 — Delete profile endpoint
@app.delete("/api/profile/{profile_id}", dependencies=[Depends(verify_api_key)])
async def delete_profile(profile_id: str):
    """Delete a profile by ID and re-run the pipeline."""
    original_count = len(_state["profiles_raw"])
    _state["profiles_raw"] = [
        p for p in _state["profiles_raw"] if p["id"] != profile_id
    ]
    if len(_state["profiles_raw"]) == original_count:
        raise HTTPException(
            status_code=404, detail=f"Profile {profile_id} not found"
        )

    dataset = {"metadata": _state["metadata"], "profiles": _state["profiles_raw"]}
    atomic_write_json(DATA_PATH, dataset)

    await _run_pipeline_safe()

    return {"status": "deleted", "profile_id": profile_id}


@app.get("/api/stats")
async def get_stats():
    """Return dashboard summary statistics."""
    await _ensure_loaded()
    return _state["stats"]


@app.get("/api/burner-leads", dependencies=[Depends(verify_api_key)])
async def get_burner_leads():
    """Return probable burner account matches for analyst review."""
    await _ensure_loaded()
    return {
        "burner_leads": _state["burner_leads"],
        "count": len(_state["burner_leads"]),
        "note": "These are analyst leads only. Manual verification required before acting."
    }


@app.get("/api/communities")
async def get_communities():
    """Return detected network communities."""
    await _ensure_loaded()
    community_groups = {}
    for node_id, community_id in _state["communities"].items():
        community_groups.setdefault(str(community_id), []).append(node_id)
    return {
        "communities": community_groups,
        "total_communities": len(community_groups),
    }


@app.get("/api/health")
async def health():
    """Lightweight health check — returns instantly even during pipeline run."""
    return {
        "status": "ok",
        "loaded": _state["loaded"],
        "error": _state.get("error"),
        "error_count": _state.get("error_count", 0),
    }


@app.get("/")
async def root():
    return {
        "app": "D-TRACK OSINT",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "data_loaded": _state["loaded"],
        "error": _state["error"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
