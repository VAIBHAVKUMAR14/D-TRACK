"""
chat_ingestor.py — Python bridge to the C++ chat ingestor output.

Reads the unified_messages.csv and alerts.csv produced by
wtf_reference/module1/chat_ingestor/ and converts them into
the profile/post format that the D-TRACK pipeline expects.

Also implements a pure-Python fallback parser for Telegram JSON
and WhatsApp TXT exports so the pipeline works without compiling C++.
"""

import csv
import json
import re
from pathlib import Path
from datetime import datetime, timezone


CHAT_OUTPUT_DIR = Path(__file__).resolve().parent.parent / \
    "wtf_reference/module1/chat_ingestor/output"
CHAT_DATA_DIR = Path(__file__).resolve().parent.parent / \
    "wtf_reference/module1/chat_ingestor/data"


# ── Entity extraction (mirrors C++ logic in Python) ───────────────────────────

def extract_entities_from_text(text: str, msg_id: str) -> list[dict]:
    """Extract wallets, phones, IMEI, license plates from a chat message."""
    alerts = []

    # ETH wallet
    for match in re.finditer(r'\b0x[a-fA-F0-9]{40}\b', text):
        alerts.append({"type": "ETH_WALLET", "value": match.group(), "msg_id": msg_id})

    # BTC wallet
    for match in re.finditer(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b', text):
        alerts.append({"type": "BTC_WALLET", "value": match.group(), "msg_id": msg_id})

    # Phone numbers
    for match in re.finditer(r'(\+?[0-9]{1,3}[\s\-.]?)?\(?[0-9]{3}\)?[\s\-.]?[0-9]{3}[\s\-.]?[0-9]{4}', text):
        val = match.group().strip()
        # Filter out matches that are part of longer digit runs (IMEI etc)
        pos = match.start()
        before = text[pos-1] if pos > 0 else ''
        after = text[pos+len(val)] if pos+len(val) < len(text) else ''
        if not (before.isdigit() or after.isdigit()):
            alerts.append({"type": "PHONE", "value": val, "msg_id": msg_id})

    # IMEI (15 digits)
    for match in re.finditer(r'\b\d{15}\b', text):
        alerts.append({"type": "IMEI", "value": match.group(), "msg_id": msg_id})

    # India license plates
    for match in re.finditer(r'\b[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}\b', text):
        alerts.append({"type": "LICENSE_PLATE", "value": match.group(), "msg_id": msg_id})

    return alerts


# ── Telegram JSON parser ───────────────────────────────────────────────────────

def parse_telegram_export(filepath: Path) -> tuple[list[dict], list[dict]]:
    """
    Parse a Telegram JSON export into unified messages and alerts.
    Returns (messages, alerts).
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    messages = []
    all_alerts = []
    chat_name = data.get('name', 'unknown_chat')

    for msg in data.get('messages', []):
        if msg.get('type') != 'message':
            continue

        # Telegram text can be a string or a list of text objects
        raw_text = msg.get('text', '')
        if isinstance(raw_text, list):
            text = ''.join(
                part if isinstance(part, str) else part.get('text', '')
                for part in raw_text
            )
        else:
            text = str(raw_text)

        if not text.strip():
            continue

        msg_id = f"TG_{msg['id']}"
        message = {
            'id': msg_id,
            'timestamp': msg.get('date', ''),
            'sender_id': str(msg.get('from_id', msg.get('from', 'unknown'))),
            'sender_name': msg.get('from', 'unknown'),
            'text': text,
            'platform': 'telegram',
            'chat_name': chat_name,
        }
        messages.append(message)
        all_alerts.extend(extract_entities_from_text(text, msg_id))

    return messages, all_alerts


# ── WhatsApp TXT parser ───────────────────────────────────────────────────────

def parse_whatsapp_export(filepath: Path) -> tuple[list[dict], list[dict]]:
    """
    Parse a WhatsApp .txt export into unified messages and alerts.

    WhatsApp format: DD/MM/YYYY, HH:MM - Sender: Message
    """
    pattern = re.compile(
        r'(\d{1,2}/\d{1,2}/\d{4}),\s(\d{1,2}:\d{2})\s-\s([^:]+):\s(.+)'
    )

    messages = []
    all_alerts = []
    counter = 1

    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            match = pattern.match(line)
            if not match:
                continue

            date_str, time_str, sender, text = match.groups()
            sender = sender.strip()
            text = text.strip()

            # Normalize sender to an ID
            sender_id = re.sub(r'[^a-zA-Z0-9]', '_', sender).lower()
            msg_id = f"WA_{counter}"
            counter += 1

            # Parse timestamp
            try:
                ts = datetime.strptime(f"{date_str} {time_str}", "%d/%m/%Y %H:%M")
                timestamp = ts.isoformat()
            except ValueError:
                timestamp = date_str

            message = {
                'id': msg_id,
                'timestamp': timestamp,
                'sender_id': sender_id,
                'sender_name': sender,
                'text': text,
                'platform': 'whatsapp',
                'chat_name': filepath.stem,
            }
            messages.append(message)
            all_alerts.extend(extract_entities_from_text(text, msg_id))

    return messages, all_alerts


# ── Read existing CSV output from C++ ingestor ────────────────────────────────

def read_ingestor_csv_output() -> tuple[list[dict], list[dict]]:
    """
    Read the unified_messages.csv and alerts.csv already produced
    by the C++ chat_ingestor binary. Use this if you've compiled
    and run the C++ module.
    """
    messages = []
    alerts = []

    messages_path = CHAT_OUTPUT_DIR / "unified_messages.csv"
    alerts_path = CHAT_OUTPUT_DIR / "alerts.csv"

    if messages_path.exists():
        with open(messages_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                messages.append(dict(row))
        print(f"[CHAT] Read {len(messages)} messages from {messages_path.name}")

    if alerts_path.exists():
        with open(alerts_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                alerts.append(dict(row))
        print(f"[CHAT] Read {len(alerts)} alerts from {alerts_path.name}")

    return messages, alerts


# ── Convert chat messages to pipeline-compatible profile format ───────────────

def messages_to_profiles(
    messages: list[dict],
    alerts: list[dict]
) -> list[dict]:
    """
    Group chat messages by sender and convert them into the
    profile/post format that nlp_engine.analyze_profile() expects.

    Each unique sender becomes a profile.
    Their messages become posts.
    Wallets and phones extracted from alerts are attached to the profile.
    """
    from collections import defaultdict

    # Group messages by sender
    sender_messages = defaultdict(list)
    for msg in messages:
        sender_id = msg.get('sender_id', 'unknown')
        sender_messages[sender_id].append(msg)

    # Group alerts by message ID for lookup
    msg_alerts = defaultdict(list)
    for alert in alerts:
        msg_alerts[alert['msg_id']].append(alert)

    profiles = []

    for sender_id, msgs in sender_messages.items():
        # Collect all wallets and phones mentioned by this sender
        wallets = []
        phones = []
        imeis = []
        plates = []

        for msg in msgs:
            for alert in msg_alerts.get(msg['id'], []):
                if alert['type'] in ('ETH_WALLET', 'BTC_WALLET'):
                    wallets.append(alert['value'])
                elif alert['type'] == 'PHONE':
                    phones.append(alert['value'])
                elif alert['type'] == 'IMEI':
                    imeis.append(alert['value'])
                elif alert['type'] == 'LICENSE_PLATE':
                    plates.append(alert['value'])

        # Use first message's sender_name and platform
        first = msgs[0]
        sender_name = first.get('sender_name', sender_id)
        platform = first.get('platform', 'telegram')
        chat_name = first.get('chat_name', 'unknown')

        # Build posts list from messages
        posts = []
        for i, msg in enumerate(msgs):
            posts.append({
                'id': msg['id'],
                'timestamp': msg.get('timestamp', ''),
                'text': msg.get('text', ''),
                'media_type': 'text',
                'engagement': {},
            })

        profile = {
            'id': f"CHAT-{sender_id[:20]}",
            'platform': platform,
            'username': f"@{sender_name.replace(' ', '_')}",
            'display_name': sender_name,
            'bio': f"Extracted from chat: {chat_name}",
            'followers': 0,
            'phone': phones[0] if phones else None,
            'wallet_addresses': list(set(wallets)),
            'posts': posts,
            # Extra fields for investigative value
            '_chat_source': chat_name,
            '_data_source': 'chat_export',
            '_extracted_phones': list(set(phones)),
            '_extracted_imeis': list(set(imeis)),
            '_extracted_plates': list(set(plates)),
        }

        profiles.append(profile)
        print(f"[CHAT] Profile created: {sender_name} | "
              f"{len(posts)} messages | "
              f"{len(wallets)} wallets | "
              f"{len(phones)} phones")

    return profiles


# ── Main ingestor entry point ─────────────────────────────────────────────────

def ingest_all_chats() -> list[dict]:
    """
    Ingest all available chat sources and return a list of profiles
    ready for the D-TRACK pipeline.

    Priority:
    1. Parse raw exports directly (Telegram JSON, WhatsApp TXT)
    2. Fall back to reading C++ ingestor CSV output if raw files unavailable
    """
    all_messages = []
    all_alerts = []

    # Parse Telegram exports
    for tg_file in CHAT_DATA_DIR.glob("*.json"):
        print(f"[CHAT] Parsing Telegram export: {tg_file.name}")
        msgs, alerts = parse_telegram_export(tg_file)
        all_messages.extend(msgs)
        all_alerts.extend(alerts)

    # Parse WhatsApp exports
    for wa_file in CHAT_DATA_DIR.glob("*.txt"):
        print(f"[CHAT] Parsing WhatsApp export: {wa_file.name}")
        msgs, alerts = parse_whatsapp_export(wa_file)
        all_messages.extend(msgs)
        all_alerts.extend(alerts)

    # Fall back to C++ CSV output if no raw files found
    if not all_messages:
        print("[CHAT] No raw chat files found. Reading C++ ingestor CSV output...")
        all_messages, all_alerts = read_ingestor_csv_output()

    if not all_messages:
        print("[CHAT] No chat data available.")
        return []

    print(f"[CHAT] Total: {len(all_messages)} messages, {len(all_alerts)} entity alerts")

    # Convert to profile format
    profiles = messages_to_profiles(all_messages, all_alerts)
    print(f"[CHAT] Converted to {len(profiles)} sender profiles")

    return profiles
