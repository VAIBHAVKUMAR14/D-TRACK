"""
identity_resolver.py — Cross-Platform Handle Stitching for D-TRACK.

Uses crypto wallet addresses as the primary key to link fragmented
identities across Instagram, Telegram, and X (Twitter).
Secondary signals: shared phone numbers, username pattern matching.
"""

import hashlib
from collections import defaultdict
from typing import Optional
import re

from backend.cleaner import normalize_phone


def resolve_identities(profile_analyses: list[dict]) -> list[dict]:
    """
    Merge fragmented profiles into unified identities.

    Primary key: shared wallet address
    Secondary: shared phone number
    Tertiary: username pattern similarity

    Args:
        profile_analyses: List of analyzed profiles from nlp_engine.

    Returns:
        List of unified identity dicts.
    """
    # ── Step 1: Build wallet → profiles mapping ──────────────────────────
    wallet_to_profiles: dict[str, list[dict]] = defaultdict(list)
    phone_to_profiles: dict[str, list[dict]] = defaultdict(list)
    unlinked_profiles: list[dict] = []

    for profile in profile_analyses:
        wallets = profile.get("wallet_addresses", [])
        phone = profile.get("phone")

        has_link = False

        # Map by wallet
        for wallet in wallets:
            wallet_to_profiles[wallet].append(profile)
            has_link = True

        # Map by phone
        if phone:
            normalized_phone = normalize_phone(phone)
            phone_to_profiles[normalized_phone].append(profile)
            has_link = True

        if not has_link:
            unlinked_profiles.append(profile)

    # ── Step 2: Merge wallet groups ──────────────────────────────────────
    # Use Union-Find to handle transitive wallet links
    profile_id_to_group: dict[str, int] = {}
    group_counter = 0
    groups: dict[int, set[str]] = defaultdict(set)

    # First pass: group by wallet
    for wallet, profiles in wallet_to_profiles.items():
        profile_ids = {p["profile_id"] for p in profiles}

        # Check if any profile already has a group
        existing_groups = set()
        for pid in profile_ids:
            if pid in profile_id_to_group:
                existing_groups.add(profile_id_to_group[pid])

        if existing_groups:
            # Merge all into the smallest group number
            target_group = min(existing_groups)
            for gid in existing_groups:
                if gid != target_group:
                    # Move all members of gid to target_group
                    for member in groups[gid]:
                        profile_id_to_group[member] = target_group
                        groups[target_group].add(member)
                    del groups[gid]
            # Add new profiles to the merged group
            for pid in profile_ids:
                profile_id_to_group[pid] = target_group
                groups[target_group].add(pid)
        else:
            # Create a new group
            for pid in profile_ids:
                profile_id_to_group[pid] = group_counter
                groups[group_counter].add(pid)
            group_counter += 1

    # Second pass: merge by phone (into existing groups where possible)
    for phone, profiles in phone_to_profiles.items():
        profile_ids = {p["profile_id"] for p in profiles}

        existing_groups = set()
        for pid in profile_ids:
            if pid in profile_id_to_group:
                existing_groups.add(profile_id_to_group[pid])

        if existing_groups:
            target_group = min(existing_groups)
            for gid in existing_groups:
                if gid != target_group:
                    for member in groups[gid]:
                        profile_id_to_group[member] = target_group
                        groups[target_group].add(member)
                    if gid in groups:
                        del groups[gid]
            for pid in profile_ids:
                profile_id_to_group[pid] = target_group
                groups[target_group].add(pid)
        else:
            for pid in profile_ids:
                if pid not in profile_id_to_group:
                    profile_id_to_group[pid] = group_counter
                    groups[group_counter].add(pid)
            group_counter += 1

    # Profiles with no wallet or phone → individual identities
    for profile in unlinked_profiles:
        pid = profile["profile_id"]
        if pid not in profile_id_to_group:
            profile_id_to_group[pid] = group_counter
            groups[group_counter].add(pid)
            group_counter += 1

    # ── Step 3: Build Unified Identities ─────────────────────────────────
    profile_lookup = {p["profile_id"]: p for p in profile_analyses}
    identities = []

    for group_id, member_ids in sorted(groups.items()):
        members = [profile_lookup[pid] for pid in member_ids if pid in profile_lookup]
        if not members:
            continue

        # Collect all data
        all_wallets = list(set(
            w for m in members for w in m.get("wallet_addresses", [])
        ))
        all_phones = list(set(
            m["phone"] for m in members if m.get("phone")
        ))
        all_platforms = list(set(m["platform"] for m in members))
        all_usernames = [m["username"] for m in members]

        # Compute aggregate scores
        max_intent = max((m["max_intent_score"] for m in members), default=0.0)
        total_flagged = sum(m["flagged_posts"] for m in members)

        sorted_pids = ",".join(sorted(member_ids))
        stable_hash = hashlib.md5(sorted_pids.encode()).hexdigest()[:8]

        identity = {
            "identity_id": f"ID-{stable_hash}",
            "primary_wallet": all_wallets[0] if all_wallets else None,
            "profiles": members,
            "platforms": all_platforms,
            "total_flagged_posts": total_flagged,
            "max_intent_score": round(max_intent, 4),
            "risk_score": 0.0,  # Filled by risk_scorer
            "risk_level": "Low",
            "shared_phone": all_phones[0] if all_phones else None,
            "all_wallets": all_wallets,
            "all_usernames": all_usernames,
        }

        identities.append(identity)

    print(f"[IDENTITY] Resolved {len(profile_analyses)} profiles -> "
          f"{len(identities)} unified identities "
          f"({len(identities) - len(unlinked_profiles)} multi-profile merges)")

    return identities


def get_cross_platform_links(identities: list[dict]) -> list[dict]:
    """
    Extract explicit cross-platform links for graph edges.

    Returns list of dicts with source_profile, target_profile, link_type.
    """
    links = []

    for identity in identities:
        profiles = identity.get("profiles", [])
        if len(profiles) < 2:
            continue

        # Create edges between all profile pairs in this identity
        for i, p1 in enumerate(profiles):
            for p2 in profiles[i + 1:]:
                # Determine link type
                shared_wallets = set(p1.get("wallet_addresses", [])) & set(p2.get("wallet_addresses", []))
                shared_phone = (
                    p1.get("phone") and p2.get("phone") and
                    normalize_phone(p1["phone"]) == normalize_phone(p2["phone"])
                )

                link_type = "same_identity"
                if shared_wallets:
                    link_type = "shared_wallet"
                elif shared_phone:
                    link_type = "shared_phone"

                links.append({
                    "source": p1["profile_id"],
                    "target": p2["profile_id"],
                    "link_type": link_type,
                    "shared_wallets": list(shared_wallets),
                    "identity_id": identity["identity_id"],
                })

    return links


def detect_promotion_links(profile_analyses: list[dict]) -> list[dict]:
    """
    Detect promotion/shill links between profiles.

    Looks for @mentions of other usernames in posts.
    """
    username_to_profile = {}
    for p in profile_analyses:
        # Store username without @ prefix
        clean_name = p["username"].lstrip("@").lower()
        username_to_profile[clean_name] = p["profile_id"]

    promo_links = []
    mention_re = re.compile(r"@(\w+)", re.IGNORECASE)

    for profile in profile_analyses:
        for post_analysis in profile.get("post_analyses", []):
            text = post_analysis.get("text", "")
            mentions = mention_re.findall(text)

            for mention in mentions:
                mention_lower = mention.lower()
                if mention_lower in username_to_profile:
                    target_id = username_to_profile[mention_lower]
                    if target_id != profile["profile_id"]:
                        promo_links.append({
                            "source": profile["profile_id"],
                            "target": target_id,
                            "link_type": "promotes",
                            "mention": f"@{mention}",
                        })

    # Deduplicate
    seen = set()
    unique_links = []
    for link in promo_links:
        key = (link["source"], link["target"])
        if key not in seen:
            seen.add(key)
            unique_links.append(link)

    return unique_links
