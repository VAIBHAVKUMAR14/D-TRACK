// API key stored in sessionStorage — prompted on first load
function getApiKey(): string {
  let key = sessionStorage.getItem("dtrack_api_key");
  if (!key) {
    key = window.prompt("Enter D-TRACK API Key:") || "changeme-replace-in-production";
    sessionStorage.setItem("dtrack_api_key", key);
  }
  return key;
}

export const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getApiKey()}`,
});

// ── Types matching FastAPI response schemas ────────────────────────────────

export interface Stats {
  total_profiles: number;
  total_posts: number;
  flagged_profiles: number;
  flagged_posts: number;
  unified_identities: number;
  organized_networks: number;
  wallets_tracked: number;
  platforms_covered: number;
  avg_risk_score: number;
  high_risk_count: number;
  total_communities: number;
  burner_leads_count: number;
}

export interface LeaderboardEntry {
  rank: number;
  identity_id: string;
  primary_usernames: string[];
  platforms: string[];
  risk_score: number;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  max_intent_score: number;
  total_flagged_posts: number;
  num_profiles: number;
  has_wallet: boolean;
  is_bot_network?: boolean;
  bot_profile_count?: number;
  score_breakdown: {
    centrality_component: number;
    intent_component: number;
    connection_component: number;
  };
}

export interface Identity {
  identity_id: string;
  all_usernames: string[];
  platforms: string[];
  all_wallets: string[];
  risk_score: number;
  risk_level: string;
  score_breakdown: Record<string, number>;
  total_flagged_posts: number;
  max_intent_score: number;
  profiles: Profile[];
  behavioral_profile?: BehavioralProfile;
  temporal_profile?: TemporalProfile;
  network_profile?: NetworkProfile;
  bot_assessment?: BotAssessment;
  probable_burner_accounts?: BurnerLead[];
  link_evidence?: LinkEvidence[];
}

export interface Profile {
  profile_id: string;
  username: string;
  platform: string;
  display_name: string;
  bio: string;
  followers: number;
  max_intent_score: number;
  flagged_posts: number;
  total_posts: number;
  wallet_addresses: string[];
  is_likely_bot?: boolean;
  bot_assessment?: BotAssessment;
  post_analyses?: PostAnalysis[];
}

export interface PostAnalysis {
  post_id: string;
  text: string;
  intent_score: number;
  flagged: boolean;
  has_drug_emojis: boolean;
  has_price_pattern: boolean;
  matched_anchor?: string;
  anchor_similarity: number;
}

export interface BehavioralProfile {
  inferred_role: string;
  role_confidence: number;
  flag_rate: number;
  role_signal_counts: Record<string, number>;
}

export interface TemporalProfile {
  peak_hour_utc: number;
  likely_timezone: string;
  weekday_posts: number;
  weekend_posts: number;
  first_seen: string;
  last_seen: string;
  active_days: number;
}

export interface NetworkProfile {
  network_role: string;
  description: string;
  metrics_used: Record<string, number>;
}

export interface BotAssessment {
  bot_probability: number;
  is_likely_bot: boolean;
  recommendation: string;
  temporal_signals: Record<string, number>;
  content_signals: Record<string, number>;
  metadata_signals: Record<string, unknown>;
}

export interface BurnerLead {
  profile_a: string;
  identity_a: string;
  profile_b: string;
  identity_b: string;
  stylometric_similarity: number;
  confidence: "high" | "medium";
  note: string;
}

export interface LinkEvidence {
  profile_a: string;
  profile_b: string;
  link_type: string;
  shared_wallets?: string[];
}

export interface NLPResult {
  text: string;
  intent_score: number;
  has_drug_emojis: boolean;
  has_price_pattern: boolean;
  has_wallet: boolean;
  flagged: boolean;
  matched_anchor?: string;
  anchor_similarity: number;
  emoji_boost: number;
  price_boost: number;
}

export interface HealthStatus {
  status: string;
  loaded: boolean;
  error: string | null;
  error_count: number;
}

// ── API functions ──────────────────────────────────────────────────────────

export const api = {
  health: (): Promise<HealthStatus> =>
    fetch("/api/health").then(r => r.json()),

  stats: (): Promise<Stats> =>
    fetch("/api/stats").then(r => r.json()),

  ingest: (): Promise<unknown> =>
    fetch("/api/ingest", { method: "POST", headers: authHeaders() }).then(r => r.json()),

  leaderboard: (): Promise<{ leaderboard: LeaderboardEntry[]; count: number }> =>
    fetch("/api/risk-scores", { headers: authHeaders() }).then(r => r.json()),

  identities: (): Promise<{ identities: Identity[]; count: number }> =>
    fetch("/api/identities", { headers: authHeaders() }).then(r => r.json()),

  identity: (id: string): Promise<Identity> =>
    fetch(`/api/identity/${id}`, { headers: authHeaders() }).then(r => r.json()),

  analyzeText: (text: string): Promise<NLPResult> =>
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then(r => r.json()),

  burnerLeads: (): Promise<{ burner_leads: BurnerLead[]; count: number; note: string }> =>
    fetch("/api/burner-leads", { headers: authHeaders() }).then(r => r.json()),

  communities: (): Promise<{ communities: Record<string, string[]>; total_communities: number }> =>
    fetch("/api/communities").then(r => r.json()),

  addProfile: (profile: unknown): Promise<unknown> =>
    fetch("/api/add-profile", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(profile),
    }).then(r => r.json()),

  deleteProfile: (id: string): Promise<unknown> =>
    fetch(`/api/profile/${id}`, { method: "DELETE", headers: authHeaders() }).then(r => r.json()),
};
