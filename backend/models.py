"""
models.py — Pydantic data models for D-TRACK.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ── Enums ────────────────────────────────────────────────────────────────────
class Platform(str, Enum):
    INSTAGRAM = "instagram"
    TELEGRAM = "telegram"
    TWITTER = "twitter"
    UNKNOWN = "unknown"


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


# ── Input Models ─────────────────────────────────────────────────────────────
class Post(BaseModel):
    id: str
    timestamp: str
    text: str
    media_type: str = "text"
    engagement: dict = Field(default_factory=dict)


class Profile(BaseModel):
    id: str
    platform: str
    username: str
    display_name: str
    bio: str = ""
    followers: int = 0
    phone: Optional[str] = None
    wallet_addresses: list[str] = Field(default_factory=list)
    posts: list[Post] = Field(default_factory=list)
    data_source: str = "synthetic"  # "synthetic" | "custom" | "real"
    added_by: Optional[str] = None
    added_at: Optional[str] = None


class MockDataset(BaseModel):
    metadata: dict = Field(default_factory=dict)
    profiles: list[Profile] = Field(default_factory=list)


# ── Analysis Output Models ───────────────────────────────────────────────────
class PostAnalysis(BaseModel):
    post_id: str
    text: str
    intent_score: float = 0.0
    has_drug_emojis: bool = False
    has_price_pattern: bool = False
    has_wallet: bool = False
    flagged: bool = False
    matched_anchor: Optional[str] = None
    anchor_similarity: float = 0.0


class ProfileAnalysis(BaseModel):
    profile_id: str
    username: str
    platform: str
    display_name: str
    bio: str = ""
    followers: int = 0
    max_intent_score: float = 0.0
    avg_intent_score: float = 0.0
    flagged_posts: int = 0
    total_posts: int = 0
    wallet_addresses: list[str] = Field(default_factory=list)
    phone: Optional[str] = None
    post_analyses: list[PostAnalysis] = Field(default_factory=list)


class UnifiedIdentity(BaseModel):
    identity_id: str
    primary_wallet: Optional[str] = None
    profiles: list[ProfileAnalysis] = Field(default_factory=list)
    platforms: list[str] = Field(default_factory=list)
    total_flagged_posts: int = 0
    max_intent_score: float = 0.0
    risk_score: float = 0.0
    risk_level: RiskLevel = RiskLevel.LOW
    shared_phone: Optional[str] = None
    all_wallets: list[str] = Field(default_factory=list)
    all_usernames: list[str] = Field(default_factory=list)


class GraphNode(BaseModel):
    id: str
    label: str
    node_type: str  # "account" | "wallet"
    platform: Optional[str] = None
    risk_score: float = 0.0
    risk_level: str = "Low"
    size: int = 20
    color: str = "#4CAF50"
    identity_id: Optional[str] = None


class GraphEdge(BaseModel):
    source: str
    target: str
    edge_type: str  # "shared_wallet" | "shared_phone" | "promotes" | "same_identity"
    weight: float = 1.0
    color: str = "#999999"


class GraphData(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


class DashboardStats(BaseModel):
    total_profiles: int = 0
    total_posts: int = 0
    flagged_profiles: int = 0
    flagged_posts: int = 0
    unified_identities: int = 0
    organized_networks: int = 0
    wallets_tracked: int = 0
    platforms_covered: int = 0
    avg_risk_score: float = 0.0
    high_risk_count: int = 0


class AnalyzeTextRequest(BaseModel):
    text: str


class AnalyzeTextResponse(BaseModel):
    text: str
    intent_score: float
    has_drug_emojis: bool
    has_price_pattern: bool
    flagged: bool
    matched_anchor: Optional[str] = None
    anchor_similarity: float = 0.0
    emoji_boost: float = 0.0
    price_boost: float = 0.0


class BotAssessment(BaseModel):
    bot_probability: float = 0.0
    is_likely_bot: bool = False
    temporal_signals: dict = Field(default_factory=dict)
    content_signals: dict = Field(default_factory=dict)
    metadata_signals: dict = Field(default_factory=dict)
    recommendation: str = "treat_as_human"


class BurnerLead(BaseModel):
    profile_a: str
    identity_a: Optional[str] = None
    profile_b: str
    identity_b: Optional[str] = None
    stylometric_similarity: float
    confidence: str
    link_type: str = "probable_burner"
    note: str = ""


class NetworkRole(BaseModel):
    network_role: str
    description: str
    metrics_used: dict = Field(default_factory=dict)
