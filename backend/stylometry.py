"""
stylometry.py — Stylometric fingerprinting for burner account detection.

Core insight: writing patterns are largely unconscious and consistent
across accounts even when an operator deliberately tries to hide identity.
Emoji habits, pricing notation, message length, and posting hours
are all stable behavioral fingerprints.

IMPORTANT: stylometric matches are surfaced as ANALYST LEADS,
not automatic identity merges. Never auto-merge on style alone.
"""

import re
import numpy as np
from collections import Counter
from datetime import datetime
from typing import Optional


# ── Feature Extraction ────────────────────────────────────────────────────────

def extract_stylometric_features(posts: list[dict]) -> dict:
    """
    Extract writing style features from a profile's posts.

    Features extracted:
    - Message length statistics (verbosity habits)
    - Emoji usage rate and preferred emojis
    - Punctuation patterns
    - Capitalization style
    - Vocabulary richness (Type-Token Ratio)
    - Price quoting style
    - Contact instruction vocabulary
    - Posting hour preference (biological clock)
    """
    texts = [p.get('text', '') for p in posts if p.get('text')]
    if not texts:
        return {}

    full_text = ' '.join(texts)
    words = full_text.lower().split()
    features = {}

    # 1. Message length — people have consistent verbosity
    lengths = [len(t) for t in texts]
    features['avg_message_length'] = round(float(np.mean(lengths)), 2)
    features['std_message_length'] = round(float(np.std(lengths)), 2)

    # 2. Emoji usage
    # Detect emojis by unicode range
    emoji_pattern = re.compile(
        "[\U00010000-\U0010ffff"
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U00002702-\U000027B0"
        "]+", flags=re.UNICODE
    )
    all_emojis = []
    for text in texts:
        all_emojis.extend(emoji_pattern.findall(text))

    features['emoji_rate'] = round(len(all_emojis) / max(len(texts), 1), 3)
    emoji_counts = Counter(all_emojis)
    features['top_emojis'] = [e for e, _ in emoji_counts.most_common(3)]

    # 3. Punctuation patterns
    features['exclamation_rate'] = round(
        full_text.count('!') / max(len(texts), 1), 3
    )
    features['ellipsis_rate'] = round(
        full_text.count('...') / max(len(texts), 1), 3
    )

    # 4. ALL CAPS usage ratio
    cap_words = sum(1 for w in words if w.isupper() and len(w) > 1)
    features['caps_ratio'] = round(cap_words / max(len(words), 1), 3)

    # 5. Type-Token Ratio (vocabulary richness)
    # Unique words / total words — consistent per person
    features['type_token_ratio'] = round(
        len(set(words)) / max(len(words), 1), 3
    )

    # 6. Price quoting style
    # How does this person write prices? Reveals mental model
    features['price_style'] = {
        'slash_g': bool(re.search(r'\d+/g', full_text, re.I)),
        'per_gram': bool(re.search(r'\d+ per gram', full_text, re.I)),
        'k_notation': bool(re.search(r'\d+k\b', full_text, re.I)),
        'rupee_symbol': bool(re.search(r'₹\d+', full_text)),
        'usd_symbol': bool(re.search(r'\$\d+', full_text)),
    }

    # 7. Contact instruction vocabulary
    # "DM", "inbox", "ping", "hit my line" — regional and habitual
    contact_words = ['dm', 'inbox', 'ping', 'hit', 'msg', 'message', 'contact', 'reach']
    features['contact_style'] = {
        w: full_text.lower().count(w)
        for w in contact_words
        if w in full_text.lower()
    }

    # 8. Posting hour preference (biological clock)
    post_hours = []
    for post in posts:
        try:
            ts = datetime.fromisoformat(
                post.get('timestamp', '').replace('Z', '+00:00')
            )
            post_hours.append(ts.hour)
        except Exception:
            continue

    if post_hours:
        features['preferred_hours'] = {
            'mean': round(float(np.mean(post_hours)), 1),
            'std': round(float(np.std(post_hours)), 1),
            'peak_hour': Counter(post_hours).most_common(1)[0][0],
        }

    return features


# ── Similarity Computation ────────────────────────────────────────────────────

def compute_stylometric_similarity(
    features_a: dict,
    features_b: dict
) -> float:
    """
    Compare two stylometric profiles.
    Returns 0.0-1.0 similarity score.

    Weights:
      Emoji overlap:        0.20 — strongest habitual signal
      Price style:          0.20 — reveals mental model
      Posting hours:        0.15 — biological clock
      Message length:       0.15 — verbosity habit
      Type-Token Ratio:     0.15 — vocabulary richness
      Contact vocabulary:   0.15 — regional patterns
    """
    if not features_a or not features_b:
        return 0.0

    score = 0.0

    # Emoji overlap
    emojis_a = set(features_a.get('top_emojis', []))
    emojis_b = set(features_b.get('top_emojis', []))
    if emojis_a or emojis_b:
        emoji_sim = len(emojis_a & emojis_b) / max(len(emojis_a | emojis_b), 1)
        score += 0.20 * emoji_sim

    # Price style match
    ps_a = features_a.get('price_style', {})
    ps_b = features_b.get('price_style', {})
    if ps_a and ps_b:
        keys = set(ps_a) | set(ps_b)
        matches = sum(1 for k in keys if ps_a.get(k) == ps_b.get(k))
        score += 0.20 * (matches / max(len(keys), 1))

    # Posting hour similarity
    ph_a = features_a.get('preferred_hours', {})
    ph_b = features_b.get('preferred_hours', {})
    if ph_a and ph_b:
        hour_diff = abs(ph_a.get('mean', 0) - ph_b.get('mean', 0))
        # Circular distance (hour 23 and hour 1 are 2 hours apart, not 22)
        hour_diff = min(hour_diff, 24 - hour_diff)
        hour_sim = max(1 - (hour_diff / 12), 0)
        score += 0.15 * hour_sim

    # Message length similarity
    len_a = features_a.get('avg_message_length', 0)
    len_b = features_b.get('avg_message_length', 0)
    if len_a and len_b:
        len_sim = 1 - abs(len_a - len_b) / max(len_a, len_b, 1)
        score += 0.15 * max(len_sim, 0)

    # Type-Token Ratio similarity
    ttr_a = features_a.get('type_token_ratio', 0)
    ttr_b = features_b.get('type_token_ratio', 0)
    if ttr_a and ttr_b:
        ttr_sim = max(1 - abs(ttr_a - ttr_b), 0)
        score += 0.15 * ttr_sim

    # Contact vocabulary overlap
    cv_a = set(features_a.get('contact_style', {}).keys())
    cv_b = set(features_b.get('contact_style', {}).keys())
    if cv_a or cv_b:
        cv_sim = len(cv_a & cv_b) / max(len(cv_a | cv_b), 1)
        score += 0.15 * cv_sim

    return round(min(score, 1.0), 3)


# ── Burner Detection ──────────────────────────────────────────────────────────

def find_probable_burner_matches(
    profile_analyses: list[dict],
    identities: list[dict],
    threshold: float = 0.65,
) -> list[dict]:
    """
    Find accounts that are likely the same operator on a burner account.

    Only compares profiles that are in DIFFERENT identity groups
    (same-group profiles are already linked by hard signals).

    Returns a list of probable matches for analyst review.
    NEVER automatically merges — stylometric evidence alone
    is not sufficient for identity resolution.

    Threshold guidance:
      > 0.80 → High confidence, strong analyst lead
      0.65-0.80 → Medium confidence, worth investigating
      < 0.65 → Noise, ignored
    """
    # Extract features for all profiles
    style_features = {}
    profile_to_identity = {}

    for identity in identities:
        for profile in identity.get('profiles', []):
            pid = profile['profile_id']
            style_features[pid] = extract_stylometric_features(
                profile.get('post_analyses', [])
            )
            profile_to_identity[pid] = identity['identity_id']

    # Compare all cross-identity pairs
    probable_matches = []
    pids = list(style_features.keys())

    for i in range(len(pids)):
        for j in range(i+1, len(pids)):
            pid_a = pids[i]
            pid_b = pids[j]

            # Skip if already in same identity group
            if profile_to_identity.get(pid_a) == profile_to_identity.get(pid_b):
                continue

            sim = compute_stylometric_similarity(
                style_features[pid_a],
                style_features[pid_b]
            )

            if sim >= threshold:
                probable_matches.append({
                    'profile_a': pid_a,
                    'identity_a': profile_to_identity.get(pid_a),
                    'profile_b': pid_b,
                    'identity_b': profile_to_identity.get(pid_b),
                    'stylometric_similarity': sim,
                    'confidence': 'high' if sim > 0.80 else 'medium',
                    'link_type': 'probable_burner',
                    'note': (
                        'No hard linking signals found. '
                        'Stylometric match only. '
                        'Requires analyst verification before acting.'
                    ),
                })

    probable_matches.sort(
        key=lambda x: x['stylometric_similarity'], reverse=True
    )
    return probable_matches
