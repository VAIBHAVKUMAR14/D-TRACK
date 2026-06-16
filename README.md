<div align="center">

# 🔍 D-TRACK

### Cross-Platform OSINT Intelligence Platform

*De-anonymize drug trafficking networks by linking fragmented social personas through crypto wallet fingerprints.*

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![NetworkX](https://img.shields.io/badge/NetworkX-Graph_Analytics-orange)](https://networkx.org)
[![BERT](https://img.shields.io/badge/NLP-MiniLM_BERT-blueviolet)](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)

</div>

---

## 🎯 The Problem

Modern drug trafficking has gone fully digital. Traffickers advertise on Instagram, negotiate on Telegram, and get paid in crypto. But they **must advertise publicly** to acquire customers — and that's their vulnerability.

Current intelligence tools fail at three critical junctions:

| Gap | Issue |
|-----|-------|
| **The Silo Problem** | Each platform is analyzed in isolation — an Instagram influencer and a Telegram drug channel look like two different people |
| **The Language Problem** | Traffickers use emojis (❄️), slang, and coded language that evade keyword-based detection |
| **The Scale Problem** | Manual OSINT investigation takes weeks per case and cannot scale |

**D-TRACK** is the first platform to bridge all three gaps automatically.

---

## 💡 How It Works

D-TRACK runs a 7-stage autonomous pipeline — from raw OSINT data to actionable intelligence in seconds:

```
┌──────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐
│  Ingest  │──▶│   NLP    │──▶│ Identity  │──▶│  Shadow  │──▶│   Risk   │──▶│   Bot &   │──▶│  Report  │
│  OSINT   │   │ Analysis │   │Resolution │   │  Graph   │   │ Scoring  │   │  Burner   │   │  Output  │
│  Data    │   │ (BERT)   │   │(Union-Find)│  │(NetworkX)│   │(Composite)│  │ Detection │   │          │
└──────────┘   └──────────┘   └───────────┘   └──────────┘   └──────────┘   └───────────┘   └──────────┘
```

### Core Capabilities

| Feature | Description |
|---------|-------------|
| 🧠 **Semantic NLP Engine** | Distilled BERT model (MiniLM-L6-v2) converts posts into 384-dim vector embeddings. Detects intent through slang, emojis, and coded language — not keywords. |
| 💰 **Crypto Wallet Fingerprinting** | Extracts wallet addresses from unstructured text. Links accounts sharing the same financial fingerprint. |
| 🔗 **Identity Resolution** | Union-Find algorithm stitches fragmented personas across Instagram, Telegram, and Twitter using wallets, phone numbers, and @mentions. |
| 🕸️ **Shadow Graph Analytics** | NetworkX graph with Louvain community detection, PageRank, and betweenness centrality to map hub operators, brokers, and runners. |
| 🤖 **Bot & Burner Detection** | 3-signal bot classifier + 6-dimension stylometric fingerprinting to detect accounts operated by the same human. |
| 🛡️ **Dual-Corroboration** | No profile escalated on language alone. Requires NLP intent >80% AND structural signal (shared wallet, network edge). |
| 📄 **Case Report Generation** | One-click exportable intelligence reports with evidence chain, flagged posts, and risk assessment. |

---

## 🏗️ Architecture

```
D-TRACK/
├── backend/                    # Python FastAPI Backend
│   ├── main.py                 # FastAPI app — 15+ REST endpoints, async pipeline
│   ├── nlp_engine.py           # Sentence-Transformers intent scoring, anchor matching
│   ├── identity_resolver.py    # Union-Find cross-platform identity stitching
│   ├── graph_builder.py        # NetworkX shadow graph + PyVis HTML generation
│   ├── risk_scorer.py          # Composite risk scoring (centrality + intent + connections)
│   ├── bot_detector.py         # 3-signal bot classification
│   ├── stylometry.py           # 6-dimension stylometric fingerprinting
│   ├── profiler.py             # Behavioral, temporal, network role profiling
│   ├── chat_ingestor.py        # Telegram JSON + WhatsApp TXT + CSV parsing
│   ├── cleaner.py              # NFKC normalization, XSS prevention, sanitization
│   └── models.py               # Pydantic validation models
├── frontend/                   # Streamlit Dashboard (legacy)
│   └── app.py                  # Single-file dark-themed dashboard
├── material-shadcn-1.0.0/      # React Frontend (primary)
│   └── material-shadcn-1.0.0/
│       └── client/src/
│           ├── pages/          # 10 feature pages
│           │   ├── landing.tsx       # Cinematic landing page
│           │   ├── dashboard.tsx     # Overview with live intelligence feed
│           │   ├── investigate.tsx   # Real-time investigation pipeline
│           │   ├── graph.tsx         # Interactive PyVis shadow graph
│           │   ├── identity.tsx      # Identity reveal + case report
│           │   ├── nlp.tsx           # NLP intent inspector
│           │   ├── leaderboard.tsx   # Risk-ranked identities
│           │   ├── burner.tsx        # Burner account leads
│           │   ├── pipeline.tsx      # Technical pipeline breakdown
│           │   └── add-profile.tsx   # Custom profile injection
│           ├── components/     # Reusable UI components (shadcn/ui)
│           └── lib/            # API client, query config
└── data/
    └── mock_data.json          # 38 synthetic profiles, 119 posts, 6 networks
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/Vinee-7-t/D_Track.git
cd D_Track

# Install Python dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env

# Start the backend server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

The backend will auto-load mock data and run the full analysis pipeline on first request.

### 2. React Frontend Setup

```bash
# Navigate to the React frontend
cd material-shadcn-1.0.0/material-shadcn-1.0.0

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Alternative: Streamlit Frontend

```bash
streamlit run frontend/app.py
```

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ingest` | Run the full 7-stage analysis pipeline |
| `GET` | `/api/graph` | Get shadow graph data (nodes + edges) |
| `GET` | `/api/graph/html` | Get interactive PyVis HTML visualization |
| `GET` | `/api/identities` | Get all unified identities |
| `GET` | `/api/identity/{id}` | Get detailed identity profile with posts |
| `GET` | `/api/risk-scores` | Get ranked risk leaderboard |
| `GET` | `/api/communities` | Get detected network communities |
| `GET` | `/api/burner-leads` | Get probable burner account matches |
| `POST` | `/api/analyze` | Analyze a single text for trafficking intent |
| `POST` | `/api/add-profile` | Inject a custom profile into the pipeline |
| `GET` | `/api/pipeline-info` | Get full technical pipeline breakdown |
| `GET` | `/api/stats` | Get system statistics |
| `GET` | `/api/health` | Health check |

---

## 🧪 Testing the NLP Engine

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"text": "❄️ Fresh batch just landed, 2500/g DM for menu"}'
```

Expected: High intent score with drug emoji detection, price pattern matching, and anchor similarity scoring.

---

## 🔐 Security Notes

- All endpoints are protected with API key authentication (`Authorization: Bearer <key>`)
- Data sanitization via NFKC normalization and XSS prevention on all inputs
- NLP runs locally via distilled BERT — no data sent to external APIs
- Designed for on-premise deployment in law enforcement environments

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**D-TRACK** — *Connecting dots that criminals deliberately scatter.*

</div>
