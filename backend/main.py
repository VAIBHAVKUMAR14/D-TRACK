"""
main.py — FastAPI Application for D-TRACK.

OSINT backend that ingests mock social media data, runs NLP intent scoring,
resolves cross-platform identities via wallet stitching, builds a shadow-graph,
and computes risk scores.
"""

import json
import os
import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

# Add parent dir to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.models import (
    AnalyzeTextRequest, AnalyzeTextResponse, DashboardStats
)
from backend.nlp_engine import analyze_profile, compute_intent_score
from backend.identity_resolver import (
    resolve_identities, get_cross_platform_links, detect_promotion_links
)
from backend.graph_builder import (
    build_shadow_graph, compute_centrality_metrics,
    graph_to_serializable, generate_pyvis_html
)
from backend.risk_scorer import (
    compute_risk_scores, update_graph_risk_scores, get_risk_leaderboard
)


# ── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="D-TRACK OSINT API",
    description="Cross-platform OSINT tool for de-anonymizing drug traffickers",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── In-Memory State ─────────────────────────────────────────────────────────
_state = {
    "loaded": False,
    "profiles_raw": [],
    "profile_analyses": [],
    "identities": [],
    "graph": None,
    "graph_data": None,
    "centrality_metrics": {},
    "leaderboard": [],
    "stats": {},
    "metadata": {},
}

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "mock_data.json"


# ── Pipeline ─────────────────────────────────────────────────────────────────
def run_full_pipeline():
    """Execute the complete D-TRACK analysis pipeline."""

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
    print(f"\n[5/5] Computing risk scores...")
    identities = compute_risk_scores(identities, centrality_metrics)
    _state["identities"] = identities

    # Update graph with risk scores
    graph_data = graph_to_serializable(graph)
    graph_data = update_graph_risk_scores(graph_data, identities)
    _state["graph_data"] = graph_data

    # Build leaderboard
    _state["leaderboard"] = get_risk_leaderboard(identities)

    # Compute stats
    all_wallets = set()
    all_platforms = set()
    for identity in identities:
        all_wallets.update(identity.get("all_wallets", []))
        all_platforms.update(identity.get("platforms", []))

    high_risk = sum(1 for i in identities
                    if i["risk_level"] in ("High", "Critical"))

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
    }

    _state["loaded"] = True

    print(f"\n{'=' * 60}")
    print(f"  Pipeline Complete!")
    print(f"  Profiles: {_state['stats']['total_profiles']}")
    print(f"  Identities: {_state['stats']['unified_identities']}")
    print(f"  High-Risk Targets: {high_risk}")
    print(f"  Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges")
    print(f"{'=' * 60}\n")


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/api/ingest")
async def ingest_data():
    """Load mock_data.json and run the full D-TRACK pipeline."""
    try:
        run_full_pipeline()
        return {
            "status": "success",
            "message": "Pipeline executed successfully",
            "stats": _state["stats"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/profiles")
async def get_profiles():
    """Return all analyzed profiles."""
    if not _state["loaded"]:
        run_full_pipeline()
    return {
        "profiles": _state["profile_analyses"],
        "count": len(_state["profile_analyses"]),
    }


@app.get("/api/graph")
async def get_graph():
    """Return graph data (nodes + edges) for visualization."""
    if not _state["loaded"]:
        run_full_pipeline()
    return _state["graph_data"]


@app.get("/api/graph/html")
async def get_graph_html():
    """Return an interactive PyVis HTML visualization."""
    if not _state["loaded"]:
        run_full_pipeline()
    if _state["graph"] is None:
        raise HTTPException(status_code=404, detail="Graph not built yet")

    html = generate_pyvis_html(_state["graph"])
    return HTMLResponse(content=html)


@app.get("/api/risk-scores")
async def get_risk_scores():
    """Return ranked risk leaderboard."""
    if not _state["loaded"]:
        run_full_pipeline()
    return {
        "leaderboard": _state["leaderboard"],
        "count": len(_state["leaderboard"]),
    }


@app.get("/api/identities")
async def get_identities():
    """Return all unified identities."""
    if not _state["loaded"]:
        run_full_pipeline()

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


@app.get("/api/identity/{identity_id}")
async def get_identity(identity_id: str):
    """Get detailed info for a specific unified identity."""
    if not _state["loaded"]:
        run_full_pipeline()

    for identity in _state["identities"]:
        if identity["identity_id"] == identity_id:
            return identity

    raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")


@app.post("/api/analyze")
async def analyze_text(request: AnalyzeTextRequest):
    """Analyze a single text string for trafficking intent."""
    result = compute_intent_score(request.text)
    return AnalyzeTextResponse(text=request.text, **result)


@app.post("/api/add-profile")
async def add_profile(profile: dict):
    """
    Add a custom profile and re-run the pipeline.
    Expects a profile dict matching the mock_data.json schema:
    {
      "id": "CUSTOM-001",
      "platform": "telegram",
      "username": "@example",
      "display_name": "Example",
      "bio": "...",
      "followers": 100,
      "phone": null,
      "wallet_addresses": [],
      "posts": [{"id": "P1", "timestamp": "...", "text": "...", "media_type": "text", "engagement": {}}]
    }
    """
    try:
        # Validate required fields
        required = ["id", "platform", "username", "display_name"]
        for field in required:
            if field not in profile:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        # Ensure posts list exists
        if "posts" not in profile:
            profile["posts"] = []
        if "wallet_addresses" not in profile:
            profile["wallet_addresses"] = []

        # Append to raw profiles
        _state["profiles_raw"].append(profile)

        # Save updated data to disk
        dataset = {"metadata": _state["metadata"], "profiles": _state["profiles_raw"]}
        with open(DATA_PATH, "w", encoding="utf-8") as f:
            json.dump(dataset, f, indent=2, ensure_ascii=False)

        # Re-run pipeline
        run_full_pipeline()

        return {
            "status": "success",
            "message": f"Profile {profile['id']} added. Pipeline re-executed.",
            "total_profiles": len(_state["profiles_raw"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/add-profiles-bulk")
async def add_profiles_bulk(data: dict):
    """
    Add multiple custom profiles at once.
    Expects: {"profiles": [profile1, profile2, ...]}
    """
    try:
        profiles = data.get("profiles", [])
        if not profiles:
            raise HTTPException(status_code=400, detail="No profiles provided")

        for profile in profiles:
            if "posts" not in profile:
                profile["posts"] = []
            if "wallet_addresses" not in profile:
                profile["wallet_addresses"] = []
            _state["profiles_raw"].append(profile)

        # Save and re-run
        dataset = {"metadata": _state["metadata"], "profiles": _state["profiles_raw"]}
        with open(DATA_PATH, "w", encoding="utf-8") as f:
            json.dump(dataset, f, indent=2, ensure_ascii=False)

        run_full_pipeline()

        return {
            "status": "success",
            "message": f"{len(profiles)} profiles added. Pipeline re-executed.",
            "total_profiles": len(_state["profiles_raw"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
async def get_stats():
    """Return dashboard summary statistics."""
    if not _state["loaded"]:
        run_full_pipeline()
    return _state["stats"]


@app.get("/")
async def root():
    return {
        "app": "D-TRACK OSINT",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "data_loaded": _state["loaded"],
    }


# ── Auto-load on startup ────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    """Auto-load data on startup."""
    try:
        run_full_pipeline()
    except Exception as e:
        print(f"[WARN] Auto-load failed: {e}")
        print("[WARN] Data will be loaded on first API call.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
