"""
bot_detector.py — Bot detection and behavioral profiling for D-TRACK.

Three independent signal sources:
  1. Temporal: posting regularity (bots post on schedules)
  2. Content: repetition detection (bots copy-paste)
  3. Metadata: account anomalies (follower ratios, username patterns)

Design decision: bots are TAGGED, not removed.
A bot's wallet links still lead to the human operator behind it.
Bot nodes get deprioritized in risk scoring but kept in the graph.
"""

import re
import hashlib
import numpy as np
from collections import Counter
from datetime import datetime


# ── Signal 1: Temporal Analysis ───────────────────────────────────────────────

def compute_posting_regularity(posts: list[dict]) -> dict:
    """
    Analyze temporal posting patterns to detect bot behavior.

    Key insight: bots have unnaturally regular inter-post intervals.
    Humans have high variance in when they post.

    Coefficient of Variation (CV) = std / mean of intervals.
    Human CV > 1.0 (high variance), Bot CV < 0.3 (clock-like regularity).
    """
    if len(posts) < 3:
        return {"bot_probability": 0.0, "signals": {}}

    timestamps = []
    for post in posts:
        try:
            ts = datetime.fromisoformat(
                post.get('timestamp', '').replace('Z', '+00:00')
            )
            timestamps.append(ts.timestamp())
        except Exception:
            continue

    if len(timestamps) < 3:
        return {"bot_probability": 0.0, "signals": {}}

    timestamps.sort()
    intervals = np.diff(timestamps)

    mean_interval = np.mean(intervals)
    std_interval = np.std(intervals)
    cv = std_interval / mean_interval if mean_interval > 0 else 0

    # Burst detection: many posts within 60 seconds
    burst_threshold = 60
    bursts = sum(1 for i in intervals if i < burst_threshold)
    burst_ratio = bursts / len(intervals)

    # Hour entropy: bots post uniformly across all hours
    # Humans concentrate posts in waking hours
    hours = [
        datetime.fromtimestamp(ts).hour
        for ts in timestamps
    ]
    hour_counts = np.bincount(hours, minlength=24)
    hour_probs = hour_counts / hour_counts.sum()
    entropy = float(-np.sum(
        p * np.log(p + 1e-9) for p in hour_probs if p > 0
    ))
    max_entropy = np.log(24)
    normalized_entropy = entropy / max_entropy

    # Score
    bot_probability = 0.0
    if cv < 0.3:
        bot_probability += 0.40
    elif cv < 0.6:
        bot_probability += 0.20

    if burst_ratio > 0.5:
        bot_probability += 0.30
    elif burst_ratio > 0.2:
        bot_probability += 0.15

    if normalized_entropy > 0.85:
        bot_probability += 0.30

    return {
        "bot_probability": round(min(bot_probability, 1.0), 3),
        "is_likely_bot": bot_probability >= 0.5,
        "signals": {
            "posting_regularity_cv": round(float(cv), 3),
            "burst_ratio": round(float(burst_ratio), 3),
            "hour_entropy": round(float(normalized_entropy), 3),
            "mean_interval_seconds": round(float(mean_interval), 1),
            "total_posts_analyzed": len(timestamps),
        }
    }


# ── Signal 2: Content Repetition ──────────────────────────────────────────────

def detect_content_repetition(posts: list[dict]) -> dict:
    """
    Detect copy-paste spam behavior.

    Two methods:
    - Exact duplicate detection via MD5 hash
    - Near-duplicate detection via character n-gram Jaccard similarity

    Capped at 50 posts to prevent O(n²) blowup on large profiles.
    """
    if len(posts) < 2:
        return {
            "repetition_score": 0.0,
            "duplicate_ratio": 0.0,
            "near_duplicate_ratio": 0.0,
            "is_likely_bot": False,
        }

    # Cap at 50 posts for performance — O(n²) pair comparison
    posts = posts[:50]
    texts = [p.get('text', '').strip().lower() for p in posts]

    # Exact duplicates
    text_hashes = [hashlib.md5(t.encode()).hexdigest() for t in texts]
    hash_counts = Counter(text_hashes)
    exact_duplicates = sum(c - 1 for c in hash_counts.values())
    exact_dup_ratio = exact_duplicates / len(texts)

    # Near-duplicates via 4-gram Jaccard
    def ngrams(text, n=4):
        return set(text[i:i+n] for i in range(len(text) - n + 1))

    near_dup_count = 0
    total_pairs = 0
    capped = False
    for i in range(len(texts)):
        if capped:
            break
        for j in range(i+1, len(texts)):
            total_pairs += 1
            if total_pairs > 500:  # hard cap on pair comparisons
                capped = True
                break
            ng1 = ngrams(texts[i])
            ng2 = ngrams(texts[j])
            if not ng1 or not ng2:
                continue
            jaccard = len(ng1 & ng2) / len(ng1 | ng2)
            if jaccard > 0.8:
                near_dup_count += 1

    near_dup_ratio = near_dup_count / max(total_pairs, 1)
    repetition_score = min(0.6 * exact_dup_ratio + 0.4 * near_dup_ratio, 1.0)

    return {
        "repetition_score": round(repetition_score, 3),
        "duplicate_ratio": round(exact_dup_ratio, 3),
        "near_duplicate_ratio": round(near_dup_ratio, 3),
        "is_likely_bot": repetition_score > 0.5,
    }


# ── Signal 3: Account Metadata ────────────────────────────────────────────────

def detect_account_anomalies(profile: dict) -> dict:
    """
    Detect bot-like account characteristics from metadata alone.
    Does not require post content.
    """
    signals = {}
    bot_score = 0.0

    followers = profile.get('followers', 0)
    posts = profile.get('posts', [])
    bio = profile.get('bio', '')
    username = profile.get('username', '')

    # High post-to-follower ratio
    if len(posts) > 0:
        ratio = len(posts) / max(followers, 1)
        if ratio > 10:
            bot_score += 0.20
            signals['high_post_follower_ratio'] = round(ratio, 2)

    # Random-looking username (letters + 4+ digits)
    if re.search(r'[a-z]{3,}\d{4,}', username.lower()):
        bot_score += 0.15
        signals['random_username_pattern'] = True

    # Empty or very short bio
    if not bio or len(bio) < 10:
        bot_score += 0.10
        signals['empty_bio'] = True

    # Zero engagement across many posts
    # Threshold raised to >10 and weight reduced to 0.10 because
    # mock data always has zero engagement — avoids false positives
    total_engagement = sum(
        sum(p.get('engagement', {}).values())
        for p in posts
        if isinstance(p.get('engagement'), dict)
    )
    if len(posts) > 10 and total_engagement == 0:
        bot_score += 0.10
        signals['zero_engagement'] = True

    return {
        "bot_score": round(min(bot_score, 1.0), 3),
        "is_likely_bot": bot_score >= 0.40,
        "signals": signals,
    }


# ── Combined Assessment ───────────────────────────────────────────────────────

def assess_bot_probability(profile: dict) -> dict:
    """
    Combine all three bot signals into a final weighted assessment.

    Weights:
      Temporal:  35% — strongest signal for automated behavior
      Content:   35% — copy-paste is definitive bot behavior
      Metadata:  30% — supporting signal only

    Returns full assessment including per-signal breakdown.
    Called inside analyze_profile() in nlp_engine.py.
    """
    temporal = compute_posting_regularity(profile.get('posts', []))
    content = detect_content_repetition(profile.get('posts', []))
    metadata = detect_account_anomalies(profile)

    final_score = (
        0.35 * temporal['bot_probability'] +
        0.35 * content['repetition_score'] +
        0.30 * metadata['bot_score']
    )

    return {
        "bot_probability": round(final_score, 3),
        "is_likely_bot": final_score >= 0.50,
        "temporal_signals": temporal.get('signals', {}),
        "content_signals": {
            "repetition_score": content['repetition_score'],
            "duplicate_ratio": content['duplicate_ratio'],
            "near_duplicate_ratio": content['near_duplicate_ratio'],
        },
        "metadata_signals": metadata.get('signals', {}),
        # Bots are tagged but NOT removed from the graph.
        # Their wallet edges still lead to the human operator.
        "recommendation": (
            "tag_and_deprioritize" if final_score >= 0.50
            else "treat_as_human"
        ),
    }
