"""
nlp_engine.py — Slang-to-Signal NLP Engine for D-TRACK.

Uses sentence-transformers (all-MiniLM-L6-v2) to compute semantic similarity
between social media posts and anchor sentences representing drug trafficking intent.
Boosts scores for drug-related emojis and price patterns.
"""

import re
import numpy as np
from typing import Optional

# Lazy-loaded model
_model = None
_anchor_embeddings = None


# ── Anchor Sentences ─────────────────────────────────────────────────────────
ANCHOR_SENTENCES = [
    "Selling premium product, DM for prices and delivery",
    "Fresh stock available, fast delivery guaranteed",
    "Wholesale available, bulk deals for regulars",
    "Product ready for pickup, payment in crypto only",
    "Best quality in town, contact for menu and pricing",
    "Got the freshest supply, DM if you know what I mean",
    "New batch just landed, premium quality only",
    "Re-stocked everything, hit me up for the full list",
    "Discreet packaging and delivery, crypto payments accepted",
    "Menu updated with new items, minimum order applies",
]

# ── Drug-related Emojis ──────────────────────────────────────────────────────
DRUG_EMOJIS = {"❄️", "🍃", "🍄", "🔌", "💊", "💉", "🌿", "🌱", "🧪", "💎", "🌈"}

# ── Price Pattern Regex ──────────────────────────────────────────────────────
PRICE_PATTERNS = [
    r"\d+\s*/\s*g\b",          # 500/g, 2500/g
    r"\d+k?\s*for\s*\d+",     # 2k for 10, 500 for 5
    r"\d+\s*/\s*(?:gram|unit|pc|piece|tab|strip)",
    r"(?:min(?:imum)?\s+(?:order\s+)?\d+)",
    r"\d{3,5}\s*/\s*(?:g|gram)\b",
    r"(?:price|rate|cost)s?\s*(?:start|from)\s*\d+",
]

# ── Wallet Address Regex ─────────────────────────────────────────────────────
ETH_WALLET_RE = re.compile(r"0x[a-fA-F0-9]{40}")
BTC_WALLET_RE = re.compile(r"\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b")
SOL_WALLET_RE = re.compile(r"\b[1-9A-HJ-NP-Za-km-z]{32,44}\b")


def _load_model():
    """Lazy-load the sentence-transformers model."""
    global _model, _anchor_embeddings
    if _model is not None:
        return

    print("[NLP] Loading sentence-transformers model (all-MiniLM-L6-v2)...")
    from sentence_transformers import SentenceTransformer
    _model = SentenceTransformer("all-MiniLM-L6-v2")

    # Pre-compute anchor embeddings
    _anchor_embeddings = _model.encode(ANCHOR_SENTENCES, normalize_embeddings=True)
    print(f"[NLP] Model loaded. {len(ANCHOR_SENTENCES)} anchor sentences encoded.")


def _cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    dot = np.dot(vec_a, vec_b)
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def detect_drug_emojis(text: str) -> tuple[bool, list[str]]:
    """Check for drug-related emojis in text."""
    found = [e for e in DRUG_EMOJIS if e in text]
    return len(found) > 0, found


def detect_price_pattern(text: str) -> bool:
    """Check for price patterns in text."""
    for pattern in PRICE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def extract_wallet_addresses(text: str) -> list[str]:
    """Extract cryptocurrency wallet addresses from text."""
    wallets = []
    wallets.extend(ETH_WALLET_RE.findall(text))
    wallets.extend(BTC_WALLET_RE.findall(text))
    # SOL addresses are harder to distinguish; only add if looks valid
    for match in SOL_WALLET_RE.finditer(text):
        addr = match.group()
        # Filter out common false positives (too short, common words)
        if len(addr) >= 32 and not addr.isalpha():
            wallets.append(addr)
    return list(set(wallets))


def compute_intent_score(text: str) -> dict:
    """
    Compute the intent score for a given text.

    Returns a dict with:
      - intent_score: float (0.0 - 1.0)
      - has_drug_emojis: bool
      - has_price_pattern: bool
      - has_wallet: bool
      - flagged: bool
      - matched_anchor: str or None
      - anchor_similarity: float
      - emoji_boost: float
      - price_boost: float
    """
    _load_model()

    # Encode the input text
    text_embedding = _model.encode([text], normalize_embeddings=True)[0]

    # Compute similarity against all anchor sentences
    similarities = []
    for anchor_emb in _anchor_embeddings:
        sim = _cosine_similarity(text_embedding, anchor_emb)
        similarities.append(sim)

    max_sim_idx = int(np.argmax(similarities))
    max_sim = float(similarities[max_sim_idx])
    matched_anchor = ANCHOR_SENTENCES[max_sim_idx]

    # Base score from semantic similarity
    base_score = max(0.0, max_sim)

    # Emoji boost
    has_emojis, found_emojis = detect_drug_emojis(text)
    emoji_boost = 0.0
    if has_emojis:
        emoji_boost = min(0.15, 0.05 * len(found_emojis))

    # Price pattern boost
    has_price = detect_price_pattern(text)
    price_boost = 0.10 if has_price else 0.0

    # Wallet presence boost
    wallets = extract_wallet_addresses(text)
    has_wallet = len(wallets) > 0
    wallet_boost = 0.05 if has_wallet else 0.0

    # Combined intent score (capped at 1.0)
    intent_score = min(1.0, base_score + emoji_boost + price_boost + wallet_boost)

    # Flagging threshold
    flagged = intent_score >= 0.4

    return {
        "intent_score": round(intent_score, 4),
        "has_drug_emojis": has_emojis,
        "has_price_pattern": has_price,
        "has_wallet": has_wallet,
        "flagged": flagged,
        "matched_anchor": matched_anchor if flagged else None,
        "anchor_similarity": round(max_sim, 4),
        "emoji_boost": round(emoji_boost, 4),
        "price_boost": round(price_boost, 4),
    }


def analyze_post(post_id: str, text: str) -> dict:
    """Analyze a single post and return full analysis."""
    result = compute_intent_score(text)
    result["post_id"] = post_id
    result["text"] = text
    return result


def analyze_profile(profile: dict) -> dict:
    """
    Analyze all posts in a profile.
    Returns profile-level analysis with aggregated scores.
    """
    post_analyses = []
    for post in profile.get("posts", []):
        analysis = analyze_post(post["id"], post["text"])
        post_analyses.append(analysis)

    # Aggregate scores
    intent_scores = [pa["intent_score"] for pa in post_analyses]
    max_intent = max(intent_scores) if intent_scores else 0.0
    avg_intent = float(np.mean(intent_scores)) if intent_scores else 0.0
    flagged_count = sum(1 for pa in post_analyses if pa["flagged"])

    return {
        "profile_id": profile["id"],
        "username": profile["username"],
        "platform": profile["platform"],
        "display_name": profile["display_name"],
        "bio": profile.get("bio", ""),
        "followers": profile.get("followers", 0),
        "max_intent_score": round(max_intent, 4),
        "avg_intent_score": round(avg_intent, 4),
        "flagged_posts": flagged_count,
        "total_posts": len(post_analyses),
        "wallet_addresses": profile.get("wallet_addresses", []),
        "phone": profile.get("phone"),
        "post_analyses": post_analyses,
    }
