# D-TRACK — Setup & Run Guide

> Cross-Platform OSINT Intelligence Tool for De-Anonymizing Drug Traffickers

---

## 📋 Prerequisites

- **Python 3.10+** installed
- **pip** package manager
- ~200MB disk space (for model download on first run)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd d_track
pip install -r requirements.txt
```

> **Note:** The `sentence-transformers` model (`all-MiniLM-L6-v2`, ~80MB) will be auto-downloaded on first run.

### 2. Start the Backend (FastAPI)

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

The API will:
- Start on `http://localhost:8000`
- Auto-load `data/mock_data.json`
- Run the full NLP + Identity + Graph + Risk pipeline
- API docs available at `http://localhost:8000/docs`

### 3. Start the Frontend (React / Vite)

Open a **new terminal** and run:

```bash
cd material-shadcn-1.0.0/material-shadcn-1.0.0
npm install
npm run dev
```

The dashboard will open at `http://localhost:5173` (check terminal output if different)

---

## 📁 Project Structure

```
d_track/
├── data/
│   └── mock_data.json          # 25 synthetic OSINT profiles
├── backend/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app + pipeline orchestration
│   ├── models.py               # Pydantic data models
│   ├── nlp_engine.py           # Slang-to-Signal NLP engine
│   ├── identity_resolver.py    # Handle stitching + wallet linking
│   ├── graph_builder.py        # NetworkX shadow-graph builder
│   └── risk_scorer.py          # Risk scoring engine
├── material-shadcn-1.0.0/
│   └── material-shadcn-1.0.0/  # React / Vite Frontend (Shadcn UI)
├── wtf_reference/              # Cloned reference repository
├── requirements.txt            # Python dependencies
├── D_TRACK_Overview.md         # Project overview (PPT-style)
└── README.md                   # This file
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Health check |
| `/api/ingest` | POST | Load data & run pipeline |
| `/api/profiles` | GET | All analyzed profiles |
| `/api/graph` | GET | Graph data (nodes + edges JSON) |
| `/api/graph/html` | GET | Interactive PyVis HTML graph |
| `/api/risk-scores` | GET | Ranked risk leaderboard |
| `/api/identities` | GET | All unified identities |
| `/api/identity/{id}` | GET | Specific identity details |
| `/api/analyze` | POST | Real-time text analysis |
| `/api/stats` | GET | Dashboard statistics |

---

## 🧪 Test the NLP Engine

```bash
# Analyze a single message
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "❄️ Fresh batch arrived! 2500/g, DM for menu 🔌"}'
```

---

## 🔧 Configuration

- **Backend port:** Change `--port 8000` in uvicorn command
- **Frontend port:** Change via Vite config in `material-shadcn-1.0.0/material-shadcn-1.0.0/vite.config.ts`
- **Mock data:** Edit `data/mock_data.json` to add/modify profiles
- **Anchor sentences:** Edit `ANCHOR_SENTENCES` in `backend/nlp_engine.py`

---

## ⚠️ Disclaimer

This tool is built for **academic/hackathon demonstration purposes only**. It uses exclusively synthetic mock data. No real personal data is collected, stored, or processed.
