"""
profiler.py — Complete behavioral profiling for D-TRACK identities.

Builds four-dimensional profiles:
  1. Behavioral: what role does this person play in the network
  2. Temporal: when do they operate, what timezone
  3. Network: what is their graph position (hub, broker, peripheral)
  4. Bot vs Human classification

This is what gets attached to every identity in /api/identity/{id}.
"""

import re
import numpy as np
from collections import Counter
from datetime import datetime
from typing import Optional


# ── Dimension 1: Behavioral Profile ──────────────────────────────────────────

def build_behavioral_profile(profile: dict, post_analyses: list[dict]) -> dict:
    """
    Infer what ROLE this account plays in the drug trafficking network
    based on the language patterns in their posts.

    Roles:
      supplier   — "stock", "batch", "wholesale", "available"
      retailer   — "delivery", "menu", "minimum order", "DM for rates"
      runner     — "drop", "pickup", "location", "meet"
      promoter   — "check out", "follow", "refer", "contact my guy"
      unknown    — insufficient signal
    """
    posts = profile.get('posts', [])
    flagged = [p for p in post_analyses if p.get('flagged')]

    total_posts = len(posts)
    flagged_count = len(flagged)
    flag_rate = flagged_count / max(total_posts, 1)

    all_text = ' '.join(
        p.get('text', '') for p in posts
    ).lower()

    role_signals = {
        'supplier': sum(
            1 for w in ['available', 'stock', 'batch', 'wholesale', 'bulk', 'supply', 'restock']
            if w in all_text
        ),
        'retailer': sum(
            1 for w in ['delivery', 'menu', 'minimum', 'order', 'dm', 'rate', 'price', 'deal']
            if w in all_text
        ),
        'runner': sum(
            1 for w in ['drop', 'pickup', 'location', 'meet', 'deliver', 'hand', 'spot']
            if w in all_text
        ),
        'promoter': sum(
            1 for w in ['check out', 'follow', 'refer', 'contact my', 'hit up', 'reach out']
            if w in all_text
        ),
    }

    max_signal = max(role_signals.values()) if role_signals else 0
    inferred_role = (
        max(role_signals, key=role_signals.get)
        if max_signal > 0 else 'unknown'
    )

    return {
        'total_posts': total_posts,
        'flagged_posts': flagged_count,
        'flag_rate': round(flag_rate, 3),
        'inferred_role': inferred_role,
        'role_confidence': round(
            role_signals.get(inferred_role, 0) /
            max(sum(role_signals.values()), 1), 3
        ),
        'role_signal_counts': role_signals,
    }


# ── Dimension 2: Temporal Profile ────────────────────────────────────────────

def build_temporal_profile(posts: list[dict]) -> dict:
    """
    Analyze WHEN this person operates.

    Reveals:
    - Likely timezone (from peak activity hour)
    - Work schedule (weekday vs weekend)
    - Account age and activity span
    - First and last seen timestamps
    """
    if not posts:
        return {}

    timestamps = []
    for post in posts:
        try:
            ts = datetime.fromisoformat(
                post.get('timestamp', '').replace('Z', '+00:00')
            )
            timestamps.append(ts)
        except Exception:
            continue

    if not timestamps:
        return {}

    hours = [ts.hour for ts in timestamps]
    days = [ts.weekday() for ts in timestamps]  # 0=Monday

    hour_counts = Counter(hours)
    peak_hour = hour_counts.most_common(1)[0][0]

    # Rough timezone inference from peak activity
    likely_tz = "UTC (unknown)"
    if 14 <= peak_hour <= 18:
        likely_tz = "IST (UTC+5:30) — evening activity"
    elif 2 <= peak_hour <= 6:
        likely_tz = "IST (UTC+5:30) — late night / early morning"
    elif 8 <= peak_hour <= 12:
        likely_tz = "UTC — morning activity"

    weekday_posts = sum(1 for d in days if d < 5)
    weekend_posts = sum(1 for d in days if d >= 5)

    return {
        'peak_hour_utc': peak_hour,
        'likely_timezone': likely_tz,
        'weekday_posts': weekday_posts,
        'weekend_posts': weekend_posts,
        'weekend_ratio': round(weekend_posts / max(weekday_posts, 1), 2),
        'first_seen': min(timestamps).isoformat(),
        'last_seen': max(timestamps).isoformat(),
        'active_days': len(set(ts.date() for ts in timestamps)),
        'total_timestamped_posts': len(timestamps),
    }


# ── Dimension 3: Network Role ─────────────────────────────────────────────────

def classify_network_role(
    node_id: str,
    centrality_metrics: dict
) -> dict:
    """
    Use graph position metrics to infer network role.
    More reliable than text analysis alone because it reflects
    actual network structure, not just self-reported language.

    Roles:
      hub_operator  — high degree + high pagerank = central operator
      broker        — high betweenness + moderate degree = middleman
      promoter      — connected to hub but low influence
      peripheral    — low everything = isolated seller or buyer
      member        — general network participant
    """
    metrics = centrality_metrics.get(node_id, {})

    degree = metrics.get('degree_centrality', 0)
    betweenness = metrics.get('betweenness_centrality', 0)
    pagerank = metrics.get('pagerank', 0)
    eigenvector = metrics.get('eigenvector_centrality', 0)

    if degree > 0.3 and pagerank > 0.05:
        role = 'hub_operator'
        description = 'Central operator — many connections, high network influence'
    elif betweenness > 0.2 and degree < 0.3:
        role = 'broker'
        description = 'Middleman — sits between clusters, likely a distributor'
    elif degree < 0.1 and betweenness < 0.05:
        role = 'peripheral'
        description = 'Isolated — low connectivity, likely solo seller or buyer'
    elif degree > 0.1 and betweenness < 0.05 and pagerank < 0.03:
        role = 'promoter'
        description = 'Promoter — connected to hub but low independent influence'
    else:
        role = 'member'
        description = 'General network member'

    return {
        'network_role': role,
        'description': description,
        'metrics_used': {
            'degree_centrality': round(degree, 4),
            'betweenness_centrality': round(betweenness, 4),
            'pagerank': round(pagerank, 4),
            'eigenvector_centrality': round(eigenvector, 4),
        }
    }


# ── Complete Profile Assembly ─────────────────────────────────────────────────

def build_complete_profile(
    profile: dict,
    post_analyses: list[dict],
    identity: dict,
    centrality_metrics: dict,
    bot_assessment: dict,
    stylometric_features: dict,
    burner_leads: list[dict],
) -> dict:
    """
    Assemble the complete D-TRACK profile for an identity.
    Combines all four dimensions into a single response object.
    Returned from /api/identity/{id}.
    """
    node_id = profile.get('profile_id', '')

    return {
        # Core identity
        'identity_id': identity['identity_id'],
        'usernames': identity.get('all_usernames', []),
        'platforms': identity.get('platforms', []),
        'wallets': identity.get('all_wallets', []),
        'risk_score': identity.get('risk_score', 0.0),
        'risk_level': identity.get('risk_level', 'Low'),
        'score_breakdown': identity.get('score_breakdown', {}),

        # Dimension 1: Behavioral
        'behavioral_profile': build_behavioral_profile(profile, post_analyses),

        # Dimension 2: Temporal
        'temporal_profile': build_temporal_profile(profile.get('posts', [])),

        # Dimension 3: Network role
        'network_profile': classify_network_role(node_id, centrality_metrics),

        # Dimension 4: Bot vs human
        'bot_assessment': bot_assessment,
        'is_human': not bot_assessment.get('is_likely_bot', False),

        # Stylometric fingerprint for burner detection
        'stylometric_features': stylometric_features,

        # Burner account leads — for analyst review only
        'probable_burner_accounts': [
            lead for lead in burner_leads
            if lead.get('profile_a') == node_id
            or lead.get('profile_b') == node_id
        ],

        # Link evidence — WHY this identity was formed
        'link_evidence': identity.get('link_evidence', []),
        
        # All underlying profiles
        'profiles': identity.get('profiles', []),
        # Expose all wallets as all_wallets to match frontend expectations
        'all_wallets': identity.get('all_wallets', []),
    }
