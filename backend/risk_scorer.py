"""
risk_scorer.py — Risk Scoring Engine for D-TRACK.

Computes a 0–100 risk score for each unified identity based on:
  - Graph centrality (40%)
  - Maximum NLP intent score (35%)
  - Connection/network score (25%)

Categorizes: Low (0-30), Medium (31-60), High (61-85), Critical (86-100)
"""

import numpy as np
from typing import Optional


def compute_risk_scores(
    identities: list[dict],
    centrality_metrics: dict[str, dict],
) -> list[dict]:
    """
    Compute risk scores for all unified identities.

    Formula:
        RiskScore = 0.40 * centrality_norm +
                    0.35 * intent_norm +
                    0.25 * connection_norm

    All components are normalized to [0, 100].

    Args:
        identities: List of unified identity dicts.
        centrality_metrics: Dict of node_id -> centrality metrics.

    Returns:
        Updated list of identities with risk_score and risk_level.
    """
    if not identities:
        return identities

    # ── Step 1: Compute raw component scores ─────────────────────────────
    raw_scores = []

    for identity in identities:
        profiles = identity.get("profiles", [])
        profile_ids = [p["profile_id"] for p in profiles]

        # --- Centrality Score ---
        # Average centrality across all profiles in this identity
        centrality_values = []
        for pid in profile_ids:
            metrics = centrality_metrics.get(pid, {})
            # Weighted combination of different centrality measures
            centrality = (
                0.3 * metrics.get("degree_centrality", 0) +
                0.3 * metrics.get("betweenness_centrality", 0) +
                0.2 * metrics.get("eigenvector_centrality", 0) +
                0.2 * metrics.get("pagerank", 0)
            )
            centrality_values.append(centrality)

        avg_centrality = np.mean(centrality_values) if centrality_values else 0.0

        # --- Intent Score ---
        max_intent = identity.get("max_intent_score", 0.0)

        # --- Connection Score ---
        # Based on: number of profiles, platforms, and flagged posts
        num_profiles = len(profiles)
        num_platforms = len(identity.get("platforms", []))
        total_flagged = identity.get("total_flagged_posts", 0)
        has_wallet = len(identity.get("all_wallets", [])) > 0

        connection_score = (
            min(1.0, num_profiles / 5.0) * 0.3 +
            min(1.0, num_platforms / 3.0) * 0.2 +
            min(1.0, total_flagged / 5.0) * 0.3 +
            (0.2 if has_wallet else 0.0)
        )

        raw_scores.append({
            "identity_id": identity["identity_id"],
            "centrality": avg_centrality,
            "intent": max_intent,
            "connection": connection_score,
        })

    # ── Step 2: Normalize to [0, 100] ────────────────────────────────────
    # Get max values for normalization
    max_centrality = max((s["centrality"] for s in raw_scores), default=1.0)
    max_centrality = max(max_centrality, 0.001)  # Avoid division by zero

    for i, (identity, scores) in enumerate(zip(identities, raw_scores)):
        # Normalize centrality
        centrality_norm = (scores["centrality"] / max_centrality) * 100

        # Intent is already 0-1, scale to 0-100
        intent_norm = scores["intent"] * 100

        # Connection is already 0-1, scale to 0-100
        connection_norm = scores["connection"] * 100

        # Weighted combination
        risk_score = (
            0.40 * centrality_norm +
            0.35 * intent_norm +
            0.25 * connection_norm
        )

        # Clamp to [0, 100]
        risk_score = max(0.0, min(100.0, risk_score))

        # Categorize
        if risk_score >= 86:
            risk_level = "Critical"
        elif risk_score >= 61:
            risk_level = "High"
        elif risk_score >= 31:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        identity["risk_score"] = round(risk_score, 1)
        identity["risk_level"] = risk_level

        # Store component scores for transparency
        identity["score_breakdown"] = {
            "centrality_component": round(centrality_norm, 2),
            "intent_component": round(intent_norm, 2),
            "connection_component": round(connection_norm, 2),
            "centrality_weight": 0.40,
            "intent_weight": 0.35,
            "connection_weight": 0.25,
        }

    # Sort by risk score (descending)
    identities.sort(key=lambda x: x["risk_score"], reverse=True)

    # Log summary
    critical = sum(1 for i in identities if i["risk_level"] == "Critical")
    high = sum(1 for i in identities if i["risk_level"] == "High")
    medium = sum(1 for i in identities if i["risk_level"] == "Medium")
    low = sum(1 for i in identities if i["risk_level"] == "Low")

    print(f"[RISK] Scores computed: "
          f"🔴 Critical={critical}, 🟠 High={high}, "
          f"🟡 Medium={medium}, 🟢 Low={low}")

    return identities


def update_graph_risk_scores(
    graph_data: dict,
    identities: list[dict],
) -> dict:
    """
    Update graph node colors and risk scores based on computed risk.
    """
    # Build identity lookup
    identity_lookup = {}
    for identity in identities:
        for profile in identity.get("profiles", []):
            identity_lookup[profile["profile_id"]] = identity

    RISK_COLORS = {
        "Critical": "#FF1744",
        "High": "#FF5722",
        "Medium": "#FF9800",
        "Low": "#4CAF50",
    }

    for node in graph_data.get("nodes", []):
        node_id = node["id"]
        if node_id in identity_lookup:
            identity = identity_lookup[node_id]
            node["risk_score"] = identity["risk_score"]
            node["risk_level"] = identity["risk_level"]
            node["color"] = RISK_COLORS.get(identity["risk_level"], "#4CAF50")

    return graph_data


def get_risk_leaderboard(identities: list[dict]) -> list[dict]:
    """
    Generate a ranked leaderboard of identities by risk score.
    """
    leaderboard = []

    for rank, identity in enumerate(identities, 1):
        profiles = identity.get("profiles", [])
        primary_usernames = [p["username"] for p in profiles[:3]]

        leaderboard.append({
            "rank": rank,
            "identity_id": identity["identity_id"],
            "primary_usernames": primary_usernames,
            "platforms": identity.get("platforms", []),
            "risk_score": identity["risk_score"],
            "risk_level": identity["risk_level"],
            "max_intent_score": identity.get("max_intent_score", 0.0),
            "total_flagged_posts": identity.get("total_flagged_posts", 0),
            "num_profiles": len(profiles),
            "has_wallet": len(identity.get("all_wallets", [])) > 0,
            "score_breakdown": identity.get("score_breakdown", {}),
        })

    return leaderboard
