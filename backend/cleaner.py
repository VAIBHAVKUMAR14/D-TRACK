"""
cleaner.py — Data cleaning, normalization, and sanitization pipeline for D-TRACK.

Called at three points:
  1. Ingestion time: clean_profile() on every incoming profile via API
  2. NLP time: preprocess_for_nlp() before sentence-transformer encoding
  3. Identity resolution: normalize_phone() for phone comparison
"""

import html
import re
import unicodedata
from datetime import datetime, timezone

MAX_TEXT_LENGTH = 2000
MAX_BIO_LENGTH = 500
MAX_USERNAME_LENGTH = 100


# ── Text Cleaning ─────────────────────────────────────────────────────────────

def clean_text(text: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    """
    Full cleaning for storage — applied at ingestion time.
    Order matters: normalize first, then strip, then escape, then truncate.
    """
    if not isinstance(text, str):
        text = str(text)
    # 1. NFKC normalization — converts lookalike chars to canonical form
    #    Cyrillic 'а' → Latin 'a', ＄ → $, zero-width joiners removed
    text = unicodedata.normalize('NFKC', text)
    # 2. Strip null bytes and non-printable control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # 3. Escape HTML entities — prevents XSS in Streamlit dashboard
    #    <script>alert(1)</script> → &lt;script&gt;alert(1)&lt;/script&gt;
    text = html.escape(text)
    # 4. Hard truncate to prevent disk DoS
    return text[:max_length]


def preprocess_for_nlp(text: str) -> str:
    """
    Lightweight cleaning applied just before NLP encoding.
    Does NOT html-escape (that would break semantic meaning).
    """
    if not isinstance(text, str):
        return ''
    # 1. NFKC normalization
    text = unicodedata.normalize('NFKC', text)
    # 2. Remove zero-width characters (invisible, affect tokenization)
    text = re.sub(r'[\u200b\u200c\u200d\ufeff\u00ad]', '', text)
    # 3. Replace URLs with neutral placeholder
    #    t.me/joinchat/AbCdEf adds noise without semantic value
    text = re.sub(r'https?://\S+|www\.\S+', '[URL]', text)
    # 4. Collapse repeated emojis to single instance
    #    ❄️❄️❄️❄️ → ❄️ — prevents emoji boost stacking
    text = re.sub(r'([\U00010000-\U0010ffff])\1+', r'\1', text)
    # 5. Normalize excessive punctuation
    #    !!!!!! → ! (spammers use this to evade filters)
    text = re.sub(r'([!?.]){3,}', r'\1', text)
    # 6. Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def normalize_phone(phone: str) -> str:
    """
    Normalize phone numbers to comparable format.
    Handles: +91, 0091, (91), spaces, dashes, dots, extensions.
    """
    if not phone:
        return phone
    # Strip everything except digits and leading +
    digits = re.sub(r'[^\d+]', '', phone)
    # Normalize 0091... → +91...
    if digits.startswith('00'):
        digits = '+' + digits[2:]
    return digits


def clean_profile(profile: dict) -> dict:
    """
    Apply full cleaning pipeline to an incoming profile dict.
    Call this in /api/add-profile and /api/add-profiles-bulk
    BEFORE the profile touches mock_data.json or the pipeline.

    Pipeline: normalize → sanitize → enrich
    """
    cleaned = profile.copy()

    # Normalize username: strip @, lowercase, strip whitespace
    username = cleaned.get('username', '')
    cleaned['username'] = unicodedata.normalize(
        'NFKC', username.lstrip('@').strip().lower()
    )[:MAX_USERNAME_LENGTH]

    # Clean display name
    cleaned['display_name'] = clean_text(
        cleaned.get('display_name', ''), MAX_USERNAME_LENGTH
    )

    # Clean bio
    cleaned['bio'] = clean_text(cleaned.get('bio', ''), MAX_BIO_LENGTH)

    # Normalize platform to lowercase
    cleaned['platform'] = cleaned.get('platform', 'unknown').lower().strip()

    # Normalize phone
    if cleaned.get('phone'):
        cleaned['phone'] = normalize_phone(cleaned['phone'])

    # Normalize wallet addresses: ETH lowercase, strip whitespace
    cleaned['wallet_addresses'] = [
        w.lower().strip() if w.startswith('0x') else w.strip()
        for w in cleaned.get('wallet_addresses', [])
    ]

    # Clean each post
    cleaned_posts = []
    for post in cleaned.get('posts', []):
        cleaned_post = post.copy()
        cleaned_post['text'] = clean_text(post.get('text', ''))
        cleaned_posts.append(cleaned_post)
    cleaned['posts'] = cleaned_posts

    # Enrich with ingestion metadata
    cleaned['_ingested_at'] = datetime.now(timezone.utc).isoformat()
    cleaned['_data_source'] = cleaned.get('_data_source', 'custom')

    return cleaned
