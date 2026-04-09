"""
D-TRACK — Streamlit Dashboard v2.0
Cross-Platform OSINT Tool for De-Anonymizing Drug Traffickers

Premium dark-themed dashboard with:
  1. Shadow-Graph: Interactive network visualization
  2. Risk Leaderboard: Ranked identity scores
  3. NLP Inspector: Real-time text analysis
  4. Identity Deep-Dive: Detailed profile views
  5. Data Input: Add custom profiles and posts
"""

import streamlit as st
import requests
import json
import time
import uuid
from datetime import datetime
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ── Page Config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="D-TRACK | OSINT Intelligence Platform",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

API_BASE = "http://localhost:8000"

# ── Inject Google Fonts + Premium CSS ────────────────────────────────────────
st.markdown("""
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
    /* ─── Global ─────────────────────────────────────── */
    * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; }
    code, pre, .stCodeBlock { font-family: 'JetBrains Mono', monospace !important; }

    .stApp {
        background: #06080f;
        color: #e2e8f0;
    }

    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0c1220 0%, #080d18 100%);
        border-right: 1px solid rgba(99, 102, 241, 0.12);
    }

    /* ─── Scrollbar ──────────────────────────────────── */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0a0e17; }
    ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #4a5568; }

    /* ─── Header Banner ──────────────────────────────── */
    .hero-banner {
        background: linear-gradient(135deg, #0f1628 0%, #1a0f30 40%, #0d1a2d 100%);
        border: 1px solid rgba(99, 102, 241, 0.15);
        border-radius: 20px;
        padding: 2rem 2.5rem;
        margin-bottom: 1.8rem;
        position: relative;
        overflow: hidden;
    }
    .hero-banner::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -20%;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
        pointer-events: none;
    }
    .hero-banner h1 {
        font-size: 2.4rem;
        font-weight: 900;
        background: linear-gradient(135deg, #818cf8, #a78bfa, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        letter-spacing: -0.03em;
        line-height: 1.1;
    }
    .hero-banner .subtitle {
        color: #64748b;
        font-size: 0.9rem;
        font-weight: 400;
        margin-top: 0.5rem;
        letter-spacing: 0.02em;
    }

    /* ─── Stat Cards ─────────────────────────────────── */
    .stat-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 14px;
        margin-bottom: 1.8rem;
    }
    .stat-card {
        background: linear-gradient(145deg, #111827 0%, #0f172a 100%);
        border: 1px solid rgba(99, 102, 241, 0.1);
        border-radius: 16px;
        padding: 1.3rem 1rem;
        text-align: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }
    .stat-card::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #818cf8, #a78bfa);
        opacity: 0;
        transition: opacity 0.3s;
    }
    .stat-card:hover {
        border-color: rgba(99, 102, 241, 0.35);
        transform: translateY(-3px);
        box-shadow: 0 8px 30px rgba(99, 102, 241, 0.12);
    }
    .stat-card:hover::after { opacity: 1; }
    .stat-icon { font-size: 1.6rem; margin-bottom: 0.4rem; }
    .stat-value {
        font-size: 2rem;
        font-weight: 800;
        background: linear-gradient(135deg, #818cf8, #a78bfa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        line-height: 1.2;
    }
    .stat-label {
        font-size: 0.7rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-top: 0.3rem;
        font-weight: 600;
    }

    /* ─── Risk Badges ────────────────────────────────── */
    .badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 14px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.75rem;
        letter-spacing: 0.03em;
        gap: 5px;
    }
    .badge-critical { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.25); }
    .badge-high { background: rgba(249,115,22,0.15); color: #fb923c; border: 1px solid rgba(249,115,22,0.25); }
    .badge-medium { background: rgba(234,179,8,0.15); color: #fbbf24; border: 1px solid rgba(234,179,8,0.25); }
    .badge-low { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.25); }

    /* ─── Platform Pills ─────────────────────────────── */
    .pill {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 8px;
        font-size: 0.7rem;
        font-weight: 600;
        margin-right: 4px;
        gap: 4px;
    }
    .pill-instagram { background: rgba(225,48,108,0.12); color: #f472b6; }
    .pill-telegram { background: rgba(0,136,204,0.12); color: #38bdf8; }
    .pill-twitter { background: rgba(29,161,242,0.12); color: #60a5fa; }

    /* ─── Leaderboard Rows ───────────────────────────── */
    .lb-row {
        background: linear-gradient(135deg, #111827 0%, #0f172a 100%);
        border: 1px solid rgba(255,255,255,0.04);
        border-radius: 14px;
        padding: 1rem 1.4rem;
        margin-bottom: 10px;
        display: grid;
        grid-template-columns: 50px 1fr 160px 140px 160px;
        align-items: center;
        gap: 16px;
        transition: all 0.25s ease;
    }
    .lb-row:hover {
        border-color: rgba(99, 102, 241, 0.25);
        background: linear-gradient(135deg, #161d30 0%, #131828 100%);
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .lb-rank {
        font-size: 1.4rem;
        font-weight: 800;
        color: #475569;
        text-align: center;
    }
    .lb-rank-top { color: #fbbf24; }
    .lb-info h4 { margin: 0; font-size: 0.95rem; color: #e2e8f0; font-weight: 700; }
    .lb-info .usernames { color: #94a3b8; font-size: 0.8rem; margin-top: 2px; }
    .lb-score-col { text-align: center; }
    .lb-score-num { font-size: 1.6rem; font-weight: 800; line-height: 1; }
    .lb-bar-wrap { background:#1e293b; border-radius:6px; height:6px; margin-top:6px; overflow:hidden; }
    .lb-bar { height:100%; border-radius:6px; transition: width 0.6s ease; }
    .lb-detail { font-size: 0.8rem; color: #94a3b8; }
    .lb-detail span { display:block; margin-bottom: 2px; }
    .lb-breakdown { font-size: 0.75rem; color: #64748b; }
    .lb-breakdown span { display:block; margin-bottom: 1px; }

    /* ─── Post Cards ─────────────────────────────────── */
    .post-card {
        background: #0c1220;
        border: 1px solid rgba(255,255,255,0.04);
        border-radius: 12px;
        padding: 1rem 1.2rem;
        margin: 8px 0;
        transition: all 0.2s ease;
    }
    .post-card:hover { border-color: rgba(255,255,255,0.08); }
    .post-flagged { border-left: 3px solid #f87171; }
    .post-clean { border-left: 3px solid #4ade80; }
    .post-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    .post-text { color: #cbd5e1; font-size: 0.88rem; line-height: 1.5; }
    .post-score {
        font-weight: 700;
        font-size: 0.85rem;
        padding: 2px 10px;
        border-radius: 8px;
    }

    /* ─── NLP Result ─────────────────────────────────── */
    .nlp-result-card {
        background: linear-gradient(135deg, #111827, #0f172a);
        border: 1px solid rgba(99,102,241,0.15);
        border-radius: 20px;
        padding: 2rem;
        text-align: center;
    }
    .nlp-big-score {
        font-size: 4rem;
        font-weight: 900;
        line-height: 1;
        margin: 0.5rem 0;
    }
    .nlp-detail-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-top: 1.2rem;
        text-align: left;
    }
    .nlp-detail-item {
        background: rgba(255,255,255,0.03);
        border-radius: 10px;
        padding: 10px 14px;
    }
    .nlp-detail-item .label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
    .nlp-detail-item .value { font-size: 0.95rem; color: #e2e8f0; font-weight: 600; margin-top: 2px; }

    /* ─── Section Titles ─────────────────────────────── */
    .section-title {
        font-size: 1.3rem;
        font-weight: 800;
        color: #e2e8f0;
        margin-bottom: 0.3rem;
        letter-spacing: -0.02em;
    }
    .section-sub {
        font-size: 0.85rem;
        color: #64748b;
        margin-bottom: 1.2rem;
    }

    /* ─── Input Form Sections ────────────────────────── */
    .form-section {
        background: linear-gradient(135deg, #111827 0%, #0f172a 100%);
        border: 1px solid rgba(99,102,241,0.1);
        border-radius: 16px;
        padding: 1.5rem;
        margin-bottom: 1rem;
    }
    .form-section h4 {
        color: #a78bfa;
        font-weight: 700;
        margin: 0 0 1rem 0;
        font-size: 1rem;
    }

    /* ─── Identity Card ──────────────────────────────── */
    .id-header {
        background: linear-gradient(135deg, #111827 0%, #1a0f30 100%);
        border: 1px solid rgba(99,102,241,0.15);
        border-radius: 18px;
        padding: 1.8rem 2rem;
        margin-bottom: 1.5rem;
    }
    .id-header h2 {
        font-size: 1.6rem;
        font-weight: 800;
        color: #e2e8f0;
        margin: 0 0 0.5rem 0;
    }

    /* ─── Tabs Override ──────────────────────────────── */
    .stTabs [data-baseweb="tab-list"] {
        gap: 4px;
        background: #0c1220;
        border-radius: 12px;
        padding: 4px;
        border: 1px solid rgba(255,255,255,0.04);
    }
    .stTabs [data-baseweb="tab"] {
        background: transparent;
        border-radius: 10px;
        padding: 10px 20px;
        color: #64748b;
        font-weight: 600;
        font-size: 0.85rem;
        border: none;
    }
    .stTabs [aria-selected="true"] {
        background: rgba(99, 102, 241, 0.12) !important;
        color: #a78bfa !important;
    }

    /* ─── Buttons ─────────────────────────────────────── */
    .stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
        border: none !important;
        border-radius: 10px !important;
        font-weight: 700 !important;
        letter-spacing: 0.02em !important;
        padding: 0.6rem 1.5rem !important;
        transition: all 0.3s !important;
    }
    .stButton > button[kind="primary"]:hover {
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4) !important;
        transform: translateY(-1px) !important;
    }

    /* ─── Misc ────────────────────────────────────────── */
    hr { border-color: rgba(255,255,255,0.04) !important; }
    .block-container { padding-top: 2rem; max-width: 1400px; }
</style>
""", unsafe_allow_html=True)


# ── Helpers ──────────────────────────────────────────────────────────────────

def api_call(endpoint, method="GET", data=None):
    try:
        url = f"{API_BASE}{endpoint}"
        if method == "GET":
            r = requests.get(url, timeout=120)
        else:
            r = requests.post(url, json=data, timeout=120)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        return None
    except Exception:
        return None


def risk_color(score):
    if score >= 86: return "#f87171"
    if score >= 61: return "#fb923c"
    if score >= 31: return "#fbbf24"
    return "#4ade80"

def risk_level_class(level):
    return f"badge-{level.lower()}"

def platform_pill(p):
    icons = {"instagram": "📸", "telegram": "✈️", "twitter": "🐦"}
    return f'<span class="pill pill-{p}">{icons.get(p, "🌐")} {p.title()}</span>'


# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style="text-align:center; padding:1.5rem 0 1rem;">
        <div style="font-size:2.5rem;">🔍</div>
        <h2 style="
            font-size:1.6rem; font-weight:900; margin:0.3rem 0 0;
            background: linear-gradient(135deg, #818cf8, #c084fc);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        ">D-TRACK</h2>
        <p style="color:#64748b; font-size:0.72rem; letter-spacing:0.12em; text-transform:uppercase; margin-top:4px;">
            OSINT Intelligence Platform
        </p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")

    if st.button("⚡ Run Pipeline", use_container_width=True, type="primary"):
        with st.spinner("Executing D-TRACK pipeline..."):
            result = api_call("/api/ingest", method="POST")
            if result:
                st.success("Pipeline complete!")
                time.sleep(0.5)
                st.rerun()

    st.markdown("")

    status = api_call("/api/stats")
    if status:
        st.markdown(f"""
        <div style="
            background: rgba(99,102,241,0.06);
            border: 1px solid rgba(99,102,241,0.1);
            border-radius: 12px;
            padding: 1rem;
            font-size: 0.82rem;
        ">
            <div style="color:#a78bfa; font-weight:700; margin-bottom:8px; font-size:0.75rem; letter-spacing:0.08em; text-transform:uppercase;">
                System Status
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                <div><span style="color:#64748b;">Profiles</span><br><b>{status.get('total_profiles',0)}</b></div>
                <div><span style="color:#64748b;">Identities</span><br><b>{status.get('unified_identities',0)}</b></div>
                <div><span style="color:#64748b;">Flagged</span><br><b style="color:#f87171;">{status.get('flagged_posts',0)}</b></div>
                <div><span style="color:#64748b;">High Risk</span><br><b style="color:#fb923c;">{status.get('high_risk_count',0)}</b></div>
                <div><span style="color:#64748b;">Networks</span><br><b>{status.get('organized_networks',0)}</b></div>
                <div><span style="color:#64748b;">Wallets</span><br><b>{status.get('wallets_tracked',0)}</b></div>
            </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.error("Backend offline")
        st.code("py -m uvicorn backend.main:app --port 8000", language="bash")

    st.markdown("---")
    st.markdown("""
    <div style="color:#475569; font-size:0.7rem; text-align:center; line-height:1.6;">
        <b>D-TRACK v2.0</b><br>
        Hackathon MVP Build<br>
        Mock + Custom Data
    </div>
    """, unsafe_allow_html=True)


# ── Hero Banner ──────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero-banner">
    <h1>D-TRACK Intelligence Dashboard</h1>
    <div class="subtitle">
        Cross-Platform OSINT &nbsp;•&nbsp; Wallet Identity Resolution &nbsp;•&nbsp; Shadow-Graph Analysis &nbsp;•&nbsp; Risk Scoring
    </div>
</div>
""", unsafe_allow_html=True)


# ── Stat Cards ───────────────────────────────────────────────────────────────
if status:
    metrics = [
        (status.get("total_profiles", 0), "Profiles Tracked", "👤"),
        (status.get("flagged_posts", 0), "Flagged Posts", "🚨"),
        (status.get("unified_identities", 0), "Identities Resolved", "🔗"),
        (status.get("wallets_tracked", 0), "Wallets Tracked", "💰"),
        (status.get("high_risk_count", 0), "High-Risk Targets", "🎯"),
    ]
    cards_html = '<div class="stat-grid">'
    for val, label, icon in metrics:
        cards_html += f"""
        <div class="stat-card">
            <div class="stat-icon">{icon}</div>
            <div class="stat-value">{val}</div>
            <div class="stat-label">{label}</div>
        </div>"""
    cards_html += '</div>'
    st.markdown(cards_html, unsafe_allow_html=True)


# ── Tabs ─────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "🕸️ Shadow-Graph",
    "🏆 Risk Leaderboard",
    "🧪 NLP Inspector",
    "🔍 Identity Deep-Dive",
    "📥 Add Custom Data",
])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 1: Shadow-Graph
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab1:
    st.markdown('<div class="section-title">🕸️ Shadow-Graph Visualizer</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Interactive network showing linked accounts, crypto wallets, and relationship edges</div>', unsafe_allow_html=True)

    graph_data = api_call("/api/graph")
    if graph_data:
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])
        accts = sum(1 for n in nodes if n.get("node_type") == "account")
        wals = sum(1 for n in nodes if n.get("node_type") == "wallet")

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Total Nodes", len(nodes))
        c2.metric("Total Edges", len(edges))
        c3.metric("Account Nodes", accts)
        c4.metric("Wallet Nodes", wals)

        st.markdown("""
        **Legend:** &nbsp; 🔴 Critical &nbsp; 🟠 High &nbsp; 🟡 Medium &nbsp; 🟢 Low &nbsp; 💛 Wallet &nbsp; | &nbsp;
        ●&thinsp;Account &nbsp; ◆&thinsp;Wallet
        """)

        try:
            resp = requests.get(f"{API_BASE}/api/graph/html", timeout=30)
            if resp.status_code == 200:
                st.components.v1.html(resp.text, height=700, scrolling=False)
        except Exception as e:
            st.warning(f"Graph rendering error: {e}")

        with st.expander("📊 Connection Breakdown"):
            edge_types = {}
            for e in edges:
                et = e.get("edge_type", "unknown")
                edge_types[et] = edge_types.get(et, 0) + 1
            for et, cnt in sorted(edge_types.items(), key=lambda x: -x[1]):
                icon = {"shared_wallet": "💰", "wallet_link": "🔗", "promotes": "📢", "shared_phone": "📱", "same_identity": "👤"}.get(et, "•")
                st.markdown(f"{icon} **{et}**: {cnt} connections")
    else:
        st.info("⚡ Click **Run Pipeline** in the sidebar to load data.")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 2: Risk Leaderboard
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab2:
    st.markdown('<div class="section-title">🏆 Risk Score Leaderboard</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Unified identities ranked by composite risk score (centrality × intent × connections)</div>', unsafe_allow_html=True)

    lb_data = api_call("/api/risk-scores")
    if lb_data:
        lb = lb_data.get("leaderboard", [])

        # Filters
        fc1, fc2 = st.columns(2)
        with fc1:
            risk_filter = st.multiselect("Risk Level", ["Critical", "High", "Medium", "Low"],
                                         default=["Critical", "High", "Medium", "Low"], key="lb_filter")
        with fc2:
            min_score = st.slider("Min Score", 0, 100, 0, key="lb_min")

        filtered = [e for e in lb if e["risk_level"] in risk_filter and e["risk_score"] >= min_score]

        for entry in filtered:
            score = entry["risk_score"]
            level = entry["risk_level"]
            color = risk_color(score)
            usernames = ", ".join(entry.get("primary_usernames", []))
            platforms = entry.get("platforms", [])
            pills_html = " ".join(platform_pill(p) for p in platforms)
            bd = entry.get("score_breakdown", {})
            rank_cls = "lb-rank-top" if entry["rank"] <= 3 else ""

            st.markdown(f"""
            <div class="lb-row">
                <div class="lb-rank {rank_cls}">#{entry['rank']}</div>
                <div class="lb-info">
                    <h4>{entry['identity_id']}</h4>
                    <div class="usernames">{usernames}</div>
                    <div style="margin-top:4px;">{pills_html}</div>
                </div>
                <div class="lb-score-col">
                    <div class="lb-score-num" style="color:{color};">{score:.0f}</div>
                    <div class="lb-bar-wrap"><div class="lb-bar" style="width:{score}%;background:{color};"></div></div>
                    <div style="margin-top:6px;">
                        <span class="badge {risk_level_class(level)}">{level.upper()}</span>
                    </div>
                </div>
                <div class="lb-detail">
                    <span>🧪 Intent: <b>{entry.get('max_intent_score',0):.2f}</b></span>
                    <span>🚨 Flagged: <b>{entry.get('total_flagged_posts',0)}</b> posts</span>
                    <span>👤 Profiles: <b>{entry.get('num_profiles',0)}</b></span>
                    <span>💰 Wallet: <b>{'Yes' if entry.get('has_wallet') else 'No'}</b></span>
                </div>
                <div class="lb-breakdown">
                    <span>🎯 Centrality: {bd.get('centrality_component',0):.0f}/100</span>
                    <span>🧪 Intent: {bd.get('intent_component',0):.0f}/100</span>
                    <span>🔗 Connection: {bd.get('connection_component',0):.0f}/100</span>
                </div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("⚡ Click **Run Pipeline** in the sidebar to load data.")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 3: NLP Inspector
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab3:
    st.markdown('<div class="section-title">🧪 NLP Intent Inspector</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Test any message against the Slang-to-Signal semantic engine in real-time</div>', unsafe_allow_html=True)

    test_text = st.text_area("Enter message to analyze:", height=110,
        placeholder="e.g. ❄️ Fresh batch arrived! Premium quality, 2500/g. DM for full menu 🔌", key="nlp_input")

    col_b, _ = st.columns([1, 3])
    with col_b:
        run_nlp = st.button("🔍 Analyze Intent", type="primary", use_container_width=True)

    if run_nlp and test_text:
        with st.spinner("Processing..."):
            result = api_call("/api/analyze", method="POST", data={"text": test_text})

        if result:
            score = result.get("intent_score", 0)
            flagged = result.get("flagged", False)
            color = risk_color(score * 100)
            status_txt = "⚠️ FLAGGED — SUSPICIOUS" if flagged else "✅ CLEAN — NO THREAT"
            status_bg = "rgba(239,68,68,0.08)" if flagged else "rgba(34,197,94,0.08)"
            emoji_ok = "✅" if result.get("has_drug_emojis") else "—"
            price_ok = "✅" if result.get("has_price_pattern") else "—"

            r1, r2 = st.columns([1, 2])
            with r1:
                st.markdown(f"""
                <div class="nlp-result-card">
                    <div style="font-size:2.5rem;">{'🚨' if flagged else '✅'}</div>
                    <div class="nlp-big-score" style="color:{color};">{score:.0%}</div>
                    <div style="font-size:0.8rem; color:#64748b; margin-bottom:0.8rem;">Intent Score</div>
                    <div style="background:{status_bg}; border-radius:10px; padding:8px 16px;">
                        <span style="font-weight:700; font-size:0.85rem; color:{color};">{status_txt}</span>
                    </div>
                </div>
                """, unsafe_allow_html=True)
            with r2:
                st.markdown(f"""
                <div class="nlp-detail-grid">
                    <div class="nlp-detail-item">
                        <div class="label">Drug Emojis</div>
                        <div class="value">{emoji_ok} {'Detected' if result.get('has_drug_emojis') else 'None found'}</div>
                    </div>
                    <div class="nlp-detail-item">
                        <div class="label">Price Patterns</div>
                        <div class="value">{price_ok} {'Detected' if result.get('has_price_pattern') else 'None found'}</div>
                    </div>
                    <div class="nlp-detail-item">
                        <div class="label">Emoji Boost</div>
                        <div class="value">+{result.get('emoji_boost',0):.2f}</div>
                    </div>
                    <div class="nlp-detail-item">
                        <div class="label">Price Boost</div>
                        <div class="value">+{result.get('price_boost',0):.2f}</div>
                    </div>
                </div>
                """, unsafe_allow_html=True)

                if result.get("matched_anchor"):
                    st.markdown(f"""
                    <div style="margin-top:16px; background:rgba(99,102,241,0.06); border-radius:12px; padding:14px 18px; border-left:3px solid #818cf8;">
                        <div style="font-size:0.72rem; color:#818cf8; text-transform:uppercase; font-weight:700; letter-spacing:0.08em; margin-bottom:6px;">
                            Closest Anchor Sentence
                        </div>
                        <div style="color:#cbd5e1; font-style:italic; font-size:0.9rem;">
                            "{result['matched_anchor']}"
                        </div>
                        <div style="color:#64748b; font-size:0.8rem; margin-top:6px;">
                            Cosine Similarity: <b>{result.get('anchor_similarity',0):.4f}</b>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("##### 💡 Quick Examples")
    ex_cols = st.columns(3)
    examples = [
        ("🚨 Coded — Explicit", "❄️ Fresh batch just landed! Premium quality, 2500/g. DM for full menu 🔌"),
        ("🟡 Coded — Subtle", "Got the freshest supply in NCR 🔌 DM if you know what I mean"),
        ("✅ Benign — Travel", "Snow capped peaks of Himachal 🏔️❄️ Nothing beats fresh mountain air"),
    ]
    for col, (label, text) in zip(ex_cols, examples):
        with col:
            st.markdown(f"**{label}**")
            st.caption(text[:60] + "..." if len(text) > 60 else text)
            if st.button(f"Try this →", key=f"ex_{label}"):
                st.session_state["nlp_input"] = text
                st.rerun()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 4: Identity Deep-Dive
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab4:
    st.markdown('<div class="section-title">🔍 Identity Deep-Dive</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Select a unified identity to explore all linked profiles, activity, and risk breakdown</div>', unsafe_allow_html=True)

    id_data = api_call("/api/identities")
    if id_data:
        identities = id_data.get("identities", [])
        if identities:
            options = [
                f"{i['identity_id']}  —  {', '.join(p['username'] for p in i.get('profiles_summary',[])[:3])} "
                f" [{i['risk_score']:.0f}/100]"
                for i in identities
            ]
            sel = st.selectbox("Select Identity:", range(len(options)), format_func=lambda x: options[x])
            sel_id = identities[sel]["identity_id"]
            full = api_call(f"/api/identity/{sel_id}")

            if full:
                score = full.get("risk_score", 0)
                level = full.get("risk_level", "Low")
                color = risk_color(score)
                platforms = full.get("platforms", [])
                wallets = full.get("all_wallets", [])
                pills = " ".join(platform_pill(p) for p in platforms)

                st.markdown(f"""
                <div class="id-header">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
                        <div>
                            <h2>{full['identity_id']}</h2>
                            <div style="margin-top:6px;">{pills}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:2.5rem; font-weight:900; color:{color}; line-height:1;">{score:.0f}</div>
                            <div style="font-size:0.7rem; color:#64748b;">RISK SCORE</div>
                            <div style="margin-top:6px;"><span class="badge {risk_level_class(level)}">{level.upper()}</span></div>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)

                mc1, mc2, mc3 = st.columns(3)
                mc1.metric("Linked Profiles", len(full.get("profiles", [])))
                mc2.metric("Flagged Posts", full.get("total_flagged_posts", 0))
                mc3.metric("Max Intent", f"{full.get('max_intent_score', 0):.2f}")

                if wallets:
                    st.markdown("#### 💰 Linked Wallets")
                    for w in wallets:
                        st.code(w, language="text")

                bd = full.get("score_breakdown", {})
                if bd:
                    st.markdown("#### 📊 Score Breakdown")
                    b1, b2, b3 = st.columns(3)
                    b1.metric("🎯 Centrality", f"{bd.get('centrality_component',0):.1f}")
                    b2.metric("🧪 Intent", f"{bd.get('intent_component',0):.1f}")
                    b3.metric("🔗 Connection", f"{bd.get('connection_component',0):.1f}")

                st.markdown("---")
                st.markdown("#### 👤 Linked Profiles & Posts")

                for profile in full.get("profiles", []):
                    pill = platform_pill(profile["platform"])
                    with st.expander(f"{profile['username']}  •  {profile['platform'].title()}  •  "
                                     f"Intent: {profile['max_intent_score']:.2f}  •  "
                                     f"Flagged: {profile['flagged_posts']}/{profile['total_posts']}"):
                        st.markdown(f"**{profile.get('display_name','N/A')}**  |  "
                                    f"Followers: {profile.get('followers',0):,}  |  "
                                    f"Bio: {profile.get('bio','—')}")

                        for post in profile.get("post_analyses", []):
                            fl = post.get("flagged", False)
                            pc = "post-flagged" if fl else "post-clean"
                            sc = post.get("intent_score", 0)
                            sc_color = risk_color(sc * 100)
                            sc_bg = f"rgba({','.join(str(int(sc_color.lstrip('#')[i:i+2],16)) for i in (0,2,4))},0.12)"

                            st.markdown(f"""
                            <div class="post-card {pc}">
                                <div class="post-header">
                                    <span style="font-weight:700; font-size:0.8rem; color:#94a3b8;">
                                        {'🚨' if fl else '✅'} {post['post_id']}
                                    </span>
                                    <span class="post-score" style="color:{sc_color}; background:{sc_bg};">
                                        {sc:.0%}
                                    </span>
                                </div>
                                <div class="post-text">{post.get('text','')}</div>
                            </div>
                            """, unsafe_allow_html=True)
        else:
            st.info("No identities resolved yet.")
    else:
        st.info("⚡ Click **Run Pipeline** in the sidebar to load data.")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 5: Add Custom Data
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab5:
    st.markdown('<div class="section-title">📥 Add Custom Data</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Add your own profiles and posts to the analysis pipeline alongside mock data</div>', unsafe_allow_html=True)

    input_mode = st.radio("Input Mode", ["📝 Form Input", "📋 JSON Input"], horizontal=True, key="input_mode")

    if input_mode == "📝 Form Input":
        st.markdown('<div class="form-section"><h4>👤 Profile Information</h4>', unsafe_allow_html=True)

        fc1, fc2 = st.columns(2)
        with fc1:
            prof_username = st.text_input("Username*", placeholder="@example_user", key="f_user")
            prof_platform = st.selectbox("Platform*", ["telegram", "instagram", "twitter"], key="f_plat")
            prof_name = st.text_input("Display Name*", placeholder="Example User", key="f_name")
        with fc2:
            prof_bio = st.text_input("Bio", placeholder="Short bio...", key="f_bio")
            prof_followers = st.number_input("Followers", min_value=0, value=0, key="f_fol")
            prof_phone = st.text_input("Phone (optional)", placeholder="+91-XXXXX-XXXXX", key="f_phone")

        prof_wallets = st.text_input("Wallet Addresses (comma separated)", placeholder="0x742d...bD68, 7xKXt...sAsU", key="f_wal")

        st.markdown("</div>", unsafe_allow_html=True)

        # Posts section
        st.markdown('<div class="form-section"><h4>📝 Posts</h4>', unsafe_allow_html=True)

        num_posts = st.number_input("Number of Posts", min_value=1, max_value=10, value=1, key="f_nump")
        posts_data = []
        for i in range(int(num_posts)):
            st.markdown(f"**Post {i+1}**")
            post_text = st.text_area(f"Post text", placeholder="Enter post content...", key=f"f_post_{i}", height=80)
            posts_data.append(post_text)

        st.markdown("</div>", unsafe_allow_html=True)

        if st.button("➕ Add Profile & Re-analyze", type="primary", use_container_width=True, key="f_submit"):
            if not prof_username or not prof_name:
                st.error("Username and Display Name are required.")
            else:
                uid = f"CUSTOM-{uuid.uuid4().hex[:6].upper()}"
                wallets = [w.strip() for w in prof_wallets.split(",") if w.strip()] if prof_wallets else []
                posts = []
                for i, txt in enumerate(posts_data):
                    if txt.strip():
                        posts.append({
                            "id": f"{uid}-P{i+1:02d}",
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                            "text": txt.strip(),
                            "media_type": "text",
                            "engagement": {"likes": 0, "shares": 0},
                        })

                profile = {
                    "id": uid,
                    "platform": prof_platform,
                    "username": prof_username if prof_username.startswith("@") else f"@{prof_username}",
                    "display_name": prof_name,
                    "bio": prof_bio or "",
                    "followers": prof_followers,
                    "phone": prof_phone or None,
                    "wallet_addresses": wallets,
                    "posts": posts,
                }

                with st.spinner("Adding profile and re-running pipeline..."):
                    result = api_call("/api/add-profile", method="POST", data=profile)

                if result and result.get("status") == "success":
                    st.success(f"✅ Profile **{uid}** added! Total profiles: {result.get('total_profiles')}")
                    st.balloons()
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error("Failed to add profile. Check backend logs.")

    else:  # JSON Input
        st.markdown('<div class="form-section"><h4>📋 Paste JSON Profile(s)</h4>', unsafe_allow_html=True)

        st.markdown("""
        Paste a single profile or an array of profiles. Each must have at minimum:
        `id`, `platform`, `username`, `display_name`, and a `posts` array.
        """)

        json_template = '''{
  "id": "CUSTOM-001",
  "platform": "telegram",
  "username": "@new_suspect",
  "display_name": "Suspect Alpha",
  "bio": "DM for deals ❄️🔌 | ETH payments",
  "followers": 500,
  "phone": null,
  "wallet_addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68"],
  "posts": [
    {
      "id": "CUSTOM-001-P01",
      "timestamp": "2026-04-01T20:00:00Z",
      "text": "❄️ Premium stock available. 3000/g. DM for menu. Fast delivery NCR 🔌",
      "media_type": "text",
      "engagement": {"likes": 0, "shares": 0}
    }
  ]
}'''

        json_input = st.text_area("Profile JSON:", value=json_template, height=350, key="json_in")
        st.markdown("</div>", unsafe_allow_html=True)

        if st.button("➕ Submit JSON & Re-analyze", type="primary", use_container_width=True, key="j_submit"):
            try:
                parsed = json.loads(json_input)

                # Handle single vs array
                if isinstance(parsed, list):
                    profiles = parsed
                else:
                    profiles = [parsed]

                with st.spinner(f"Adding {len(profiles)} profile(s) and re-running pipeline..."):
                    if len(profiles) == 1:
                        result = api_call("/api/add-profile", method="POST", data=profiles[0])
                    else:
                        result = api_call("/api/add-profiles-bulk", method="POST", data={"profiles": profiles})

                if result and result.get("status") == "success":
                    st.success(f"✅ {result.get('message', 'Profiles added!')}")
                    st.balloons()
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error("Failed to add. Check the JSON format and backend logs.")

            except json.JSONDecodeError as e:
                st.error(f"Invalid JSON: {e}")


# ── Footer ───────────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown("""
<div style="text-align:center; color:#374151; font-size:0.75rem; padding:1rem 0 2rem; line-height:1.6;">
    <b style="color:#6366f1;">D-TRACK</b> &nbsp;|&nbsp;
    Cross-Platform OSINT Intelligence &nbsp;|&nbsp;
    Synthetic Data Only &nbsp;|&nbsp;
    Academic / Hackathon Use<br>
    <span style="color:#1e293b;">▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬</span>
</div>
""", unsafe_allow_html=True)
