"""
cleaner.py — Data Cleaning & Sanitisation Layer for D-TRACK.

Provides text cleaning, NLP preprocessing, and phone normalisation
utilities to prevent XSS, injection, and ensure consistent entity resolution.
"""

import html
import re
import unicodedata

MAX_TEXT_LENGTH = 2000
MAX_BIO_LENGTH = 500


def clean_text(text: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    """Clean user-supplied text before storage and NLP processing."""
    if not isinstance(text, str):
        text = str(text)
    # 1. Normalize unicode — kills lookalike char obfuscation
    text = unicodedata.normalize('NFKC', text)
    # 2. Strip null bytes and control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # 3. Escape HTML to prevent XSS
    text = html.escape(text)
    # 4. Truncate
    return text[:max_length]


def preprocess_for_nlp(text: str) -> str:
    """Clean text specifically before NLP encoding."""
    text = unicodedata.normalize('NFKC', text)
    # Replace URLs with placeholder token
    text = re.sub(r'https?://\S+', '[URL]', text)
    # Collapse repeated emojis (prevent boost stacking)
    text = re.sub(r'([\U00010000-\U0010ffff])\1+', r'\1', text)
    return text.strip()


def normalize_phone(phone: str) -> str:
    """Normalize phone numbers to a comparable format.

    Strips all non-digit characters except leading '+',
    normalises '00' international prefix to '+'.
    """
    if not phone:
        return phone
    # Remove parentheses, spaces, dashes, dots
    digits = re.sub(r'[^\d+]', '', phone)
    # Normalise 00 prefix to +
    if digits.startswith('00'):
        digits = '+' + digits[2:]
    return digits
