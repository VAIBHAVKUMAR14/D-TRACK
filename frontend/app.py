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
import html as html_lib
import os
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
API_KEY = os.getenv("DTRACK_API_KEY", "changeme-replace-in-production")
AUTH_HEADERS = {"Authorization": f"Bearer {API_KEY}"}

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

def api_call(endpoint, method="GET", data=None, auth=False):
    """Call backend API with optional auth and differentiated error handling."""
    try:
        url = f"{API_BASE}{endpoint}"
        headers = AUTH_HEADERS if auth else {}
        if method == "GET":
            r = requests.get(url, timeout=120, headers=headers)
        elif method == "DELETE":
            r = requests.delete(url, timeout=120, headers=headers)
        else:
            r = requests.post(url, json=data, timeout=120, headers=headers)
        r.raise_for_status()
        # Handle HTML responses (graph)
        content_type = r.headers.get("content-type", "")
        if "text/html" in content_type:
            return {"_html": r.text}
        return r.json()
    except requests.exceptions.ConnectionError:
        return {"_error": "backend_offline", "_msg": "Backend is not running. Start it with: uvicorn backend.main:app --port 8000"}
    except requests.exceptions.Timeout:
        return {"_error": "timeout", "_msg": "Request timed out. The pipeline may still be running."}
    except requests.exceptions.HTTPError as e:
        return {"_error": "http_error", "_msg": str(e)}
    except Exception as e:
        return {"_error": "unknown", "_msg": str(e)}


def is_error(result):
    """Check if an API result is an error."""
    return result is None or (isinstance(result, dict) and "_error" in result)


def show_error(result):
    """Display a differentiated error message."""
    if result is None:
        st.error("No response from backend.")
    elif result.get("_error") == "backend_offline":
        st.error(result["_msg"])
        st.code("uvicorn backend.main:app --reload --port 8000", language="bash")
    elif result.get("_error") == "timeout":
        st.warning(result["_msg"])
    else:
        st.warning(result.get("_msg", "Unknown error"))


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
            result = api_call("/api/ingest", method="POST", auth=True)
            if not is_error(result):
                st.success("Pipeline complete!")
                time.sleep(0.5)
                st.rerun()
            else:
                show_error(result)

    st.markdown("")

    status = api_call("/api/stats")
    if not is_error(status):
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
        show_error(status)

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
    "🔍 Identity Deep-Dive",
    "📥 Add Custom Data",
    "🕵️ Burner Leads",
])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 1: Shadow-Graph
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab1:
    st.markdown('<div class="section-title">🕸️ Shadow-Graph Visualizer</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Interactive network showing linked accounts, crypto wallets, and relationship edges</div>', unsafe_allow_html=True)

    graph_data = api_call("/api/graph")
    if not is_error(graph_data):
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
        ● Human account &nbsp; ■ Bot account &nbsp; ◆ Wallet &nbsp; | &nbsp; ⚠️ Dashed border = bot flagged
        """)

        graph_html = api_call("/api/graph/html", auth=True)
        if not is_error(graph_html) and graph_html.get("_html"):
            st.components.v1.html(graph_html["_html"], height=700, scrolling=False)
        elif is_error(graph_html):
            st.warning(f"Graph rendering error: {graph_html.get('_msg', 'Unknown')}")

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

    lb_data = api_call("/api/risk-scores", auth=True)
    if not is_error(lb_data):
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
            usernames = html_lib.escape(", ".join(entry.get("primary_usernames", [])))
            platforms = entry.get("platforms", [])
            pills_html = " ".join(platform_pill(p) for p in platforms)
            bd = entry.get("score_breakdown", {})
            rank_cls = "lb-rank-top" if entry["rank"] <= 3 else ""

            bot_badge = ""
            if entry.get("is_bot_network"):
                bot_count = entry.get("bot_profile_count", 0)
                bot_badge = f'<span style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:2px 8px; font-size:0.7rem; font-weight:700; margin-left:6px;">⚠️ {bot_count} BOT</span>'

            st.markdown(f"""
            <div class="lb-row">
                <div class="lb-rank {rank_cls}">#{entry['rank']}</div>
                <div class="lb-info">
                    <h4>{entry['identity_id']}</h4>
                    <div class="usernames">{usernames}{bot_badge}</div>
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
        if is_error(lb_data):
            show_error(lb_data)
        else:
            st.info("⚡ Click **Run Pipeline** in the sidebar to load data.")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 3: Identity Deep-Dive
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab3:
    st.markdown('<div class="section-title">🔍 Identity Deep-Dive</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Select a unified identity to explore all linked profiles, activity, and risk breakdown</div>', unsafe_allow_html=True)

    id_data = api_call("/api/identities", auth=True)
    if not is_error(id_data):
        identities = id_data.get("identities", [])
        if identities:
            options = [
                f"{i['identity_id']}  —  {', '.join(p['username'] for p in i.get('profiles_summary',[])[:3])} "
                f" [{i['risk_score']:.0f}/100]"
                for i in identities
            ]
            sel = st.selectbox("Select Identity:", range(len(options)), format_func=lambda x: options[x])
            sel_id = identities[sel]["identity_id"]
            full = api_call(f"/api/identity/{sel_id}", auth=True)

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
                        safe_display = html_lib.escape(profile.get('display_name', 'N/A'))
                        safe_bio = html_lib.escape(profile.get('bio', '—'))
                        st.markdown(f"**{safe_display}**  |  "
                                    f"Followers: {profile.get('followers',0):,}  |  "
                                    f"Bio: {safe_bio}")

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
                                <div class="post-text">{html_lib.escape(post.get('text',''))}</div>
                            </div>
                            """, unsafe_allow_html=True)

                        bot = profile.get("bot_assessment", {})
                        if bot.get("is_likely_bot"):
                            st.markdown(f"""
                            <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2);
                                        border-radius:10px; padding:0.8rem 1.2rem; margin:8px 0;">
                                <div style="color:#f59e0b; font-weight:700; font-size:0.85rem;">
                                    ⚠️ BOT DETECTED — {bot.get('bot_probability', 0):.0%} confidence
                                </div>
                                <div style="color:#94a3b8; font-size:0.78rem; margin-top:4px;">
                                    Recommendation: {bot.get('recommendation', 'tag_and_deprioritize')}
                                </div>
                                <div style="color:#64748b; font-size:0.75rem; margin-top:6px;">
                                    Temporal signals: CV={bot.get('temporal_signals', {{}}).get('posting_regularity_cv', 'N/A')} ·
                                    Burst ratio: {bot.get('temporal_signals', {{}}).get('burst_ratio', 'N/A')} ·
                                    Duplicate ratio: {bot.get('content_signals', {{}}).get('duplicate_ratio', 'N/A')}
                                </div>
                            </div>
                            """, unsafe_allow_html=True)
        else:
            st.info("No identities resolved yet.")
    else:
        if is_error(id_data):
            show_error(id_data)
        else:
            st.info("⚡ Click **Run Pipeline** in the sidebar to load data.")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 4: Add Custom Data
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab4:
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
                    result = api_call("/api/add-profile", method="POST", data=profile, auth=True)

                if not is_error(result) and result.get("status") == "success":
                    st.success(f"✅ Profile **{uid}** added! Total profiles: {result.get('total_profiles')}")
                    st.balloons()
                    time.sleep(1)
                    st.rerun()
                elif is_error(result):
                    show_error(result)
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
                        result = api_call("/api/add-profile", method="POST", data=profiles[0], auth=True)
                    else:
                        result = api_call("/api/add-profiles-bulk", method="POST", data={"profiles": profiles}, auth=True)

                if not is_error(result) and result.get("status") == "success":
                    st.success(f"✅ {result.get('message', 'Profiles added!')}")
                    st.balloons()
                    time.sleep(1)
                    st.rerun()
                elif is_error(result):
                    show_error(result)
                else:
                    st.error("Failed to add. Check the JSON format and backend logs.")

            except json.JSONDecodeError as e:
                st.error(f"Invalid JSON: {e}")

    # --- Chat Ingest Section ---
    st.markdown("---")
    st.markdown('<div class="section-title">💬 Chat Ingest</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Paste raw chat export or conversation below</div>', unsafe_allow_html=True)

    chat_text = st.text_area("Paste Telegram/WhatsApp messages, or any chat logs...", height=300, key="chat_input")
    platform_hint = st.selectbox("Platform / source hint (optional)", ["auto", "telegram", "whatsapp", "signal", "other"], key="chat_plat")

    if st.button("🔍 Analyse Chat", type="primary", use_container_width=True, key="chat_submit"):
        if not chat_text.strip():
            st.error("Please paste some chat logs first.")
        else:
            with st.spinner("Analyzing chat for entities..."):
                payload = {"text": chat_text, "platform_hint": platform_hint}
                result = api_call("/api/ingest-chat", method="POST", data=payload, auth=True)
                
            if result and not is_error(result) and result.get("status") == "success":
                st.success("✅ Chat processed!")
                
                c1, c2, c3 = st.columns(3)
                c1.metric("Wallets Found", len(result["entities_found"]["wallets"]))
                c2.metric("Phones Found", len(result["entities_found"]["phones"]))
                c3.metric("Plates & IMEIs", len(result["entities_found"]["license_plates"]) + len(result["entities_found"]["imeis"]))
                
                st.markdown("#### Entities Extracted")
                if result["entities_found"]["wallets"]:
                    st.write(f"**Wallets:** {', '.join(result['entities_found']['wallets'])}")
                if result["entities_found"]["phones"]:
                    st.write(f"**Phones:** {', '.join(result['entities_found']['phones'])}")
                if result["entities_found"]["license_plates"]:
                    st.write(f"**License Plates:** {', '.join(result['entities_found']['license_plates'])}")
                    
                st.markdown(f"**Matched/Linked against Known Profiles:** {result['profiles_linked']}")
                if result.get("matched_profiles"):
                    st.caption(f"Profile IDs: {', '.join(result['matched_profiles'])}")
                    
                st.markdown(f"**New Shadow Profiles Created:** {result['profiles_created']}")
                if result.get("new_profile_ids"):
                    st.caption(f"New IDs: {', '.join(result['new_profile_ids'])}")
                
                if st.button("🔄 Re-run pipeline with new data"):
                    with st.spinner("Triggering full intelligence pipeline..."):
                        p_res = api_call("/api/ingest", method="POST", auth=True)
                        if p_res and not is_error(p_res):
                            st.success("Pipeline executed successfully!")
                            time.sleep(1)
                            st.rerun()
                        else:
                            st.error("Pipeline failed.")
            else:
                show_error(result)



# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 5: Burner Leads
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab5:
    st.markdown('<div class="section-title">🕵️ Probable Burner Accounts</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Accounts with no hard linking signals but high stylometric similarity — analyst leads only, require manual verification</div>', unsafe_allow_html=True)

    burner_data = api_call("/api/burner-leads", auth=True)
    if not is_error(burner_data):
        leads = burner_data.get("burner_leads", [])
        if leads:
            st.markdown(f"**{len(leads)}** probable burner match(es) detected")
            for lead in leads:
                sim = lead['stylometric_similarity']
                conf_color = "#f87171" if lead['confidence'] == 'high' else "#fbbf24"
                st.markdown(f"""
                <div style="background:#111827; border:1px solid rgba(255,255,255,0.06);
                            border-left: 3px solid {conf_color};
                            border-radius:12px; padding:1rem 1.4rem; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <b style="color:#e2e8f0;">{html_lib.escape(lead['profile_a'])}</b>
                            <span style="color:#64748b;"> ↔ </span>
                            <b style="color:#e2e8f0;">{html_lib.escape(lead['profile_b'])}</b>
                        </div>
                        <div style="color:{conf_color}; font-weight:700;">
                            {sim:.0%} match · {lead['confidence'].upper()}
                        </div>
                    </div>
                    <div style="display:flex; gap:12px; margin-top:6px;">
                        <span style="color:#94a3b8; font-size:0.8rem;">Identity A: <b>{html_lib.escape(str(lead.get('identity_a', 'N/A')))}</b></span>
                        <span style="color:#94a3b8; font-size:0.8rem;">Identity B: <b>{html_lib.escape(str(lead.get('identity_b', 'N/A')))}</b></span>
                    </div>
                    <div style="color:#64748b; font-size:0.8rem; margin-top:6px;">
                        {html_lib.escape(lead['note'])}
                    </div>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.success("No probable burner accounts detected.")
    else:
        show_error(burner_data)


# ── Footer ───────────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown("""
<div style="text-align:center; color:#374151; font-size:0.75rem; padding:1rem 0 2rem; line-height:1.6;">
    <b style="color:#6366f1;">D-TRACK v2.0</b> &nbsp;|&nbsp;
    Cross-Platform OSINT Intelligence &nbsp;|&nbsp;
    Synthetic Data Only &nbsp;|&nbsp;
    Academic / Hackathon Use<br>
    <span style="color:#1e293b;">▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬</span>
</div>
""", unsafe_allow_html=True)
