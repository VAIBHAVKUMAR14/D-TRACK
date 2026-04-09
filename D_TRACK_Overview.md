# D-TRACK: Cross-Platform OSINT Intelligence Platform

> **De-anonymizing Drug Traffickers Using Crypto Wallet Identity Resolution & Semantic NLP**

---

## 🎯 Problem Statement

### Drug trafficking has gone digital — and our detection tools are a decade behind

> *"A dealer in Delhi doesn't stand on a street corner anymore. He has 4,000 Instagram followers, a Telegram bot that takes orders 24/7, and gets paid in crypto. And right now, no system in the world automatically connects those three things."*

#### The Three Core Problems

| Problem | Description |
|---|---|
| 🔒 **The Silo Problem** | Drug networks fragment operations across platforms — Instagram for advertising, Telegram for distribution, Crypto for payments. No tool bridges these worlds. |
| 🗣️ **The Language Problem** | Traffickers use coded emoji language (❄️ + 💊 + prices). Keyword filters are completely blind to `❄️ 2500/g DM for menu 🔌`. |
| 📊 **The Scale Problem** | Understaffed cybercrime units can't manually cross-reference thousands of accounts. High-value targets drown in noise. |

#### The Numbers

- 🇮🇳 **1 lakh+** drug-related cases in India in 2023 alone
- 💰 **$315 billion** global online drug market
- 📱 **Thousands** of active Telegram drug channels operating openly
- 🔗 **$24.2 billion** in crypto received by illicit addresses (Chainalysis 2023)

---

## 💡 Proposed Solution

### D-TRACK: The first identity bridge between social media and blockchain

D-TRACK treats the **crypto wallet address as a primary key** — a permanent, cross-platform fingerprint that links a "clean" lifestyle persona to a "dirty" distribution operation.

### Four Core Features

#### 1. 🧪 Slang-to-Signal Detection Engine
- **Semantic embeddings** (sentence-transformers) detect deal intent from emoji proximity, price patterns, and contact handles
- No keyword dependency — catches what keyword filters can't
- Scores every post with an `intent_score` (0.0 – 1.0)

#### 2. 🔗 Cross-Platform Handle Stitching
- Uses **wallet address as fingerprint** to link identities across Instagram, Telegram, and X
- Secondary signals: shared phone numbers, bio links, @mention patterns
- Union-Find algorithm merges fragmented identities into unified profiles

#### 3. 🕸️ Shadow-Graph Visualizer
- Interactive network graph: nodes = accounts + wallets, edges = shared identifiers
- Reveals whether a target is an isolated seller or part of an organized network
- Click nodes for full profile details, zoom into clusters

#### 4. 🎯 Risk Scoring Dashboard
- 0-100 score per identity: `40% centrality + 35% intent + 25% connections`
- Ranked leaderboard surfaces high-value targets
- Categorized: 🟢 Low → 🟡 Medium → 🟠 High → 🔴 Critical

---

## ⚙️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     D-TRACK PIPELINE                         │
│                                                              │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────┐      │
│  │  INGEST   │───▶│  NLP      │───▶│  IDENTITY        │      │
│  │           │    │  ENGINE   │    │  RESOLVER        │      │
│  │ mock_data │    │           │    │                  │      │
│  │ .json     │    │ sentence- │    │ Wallet Stitching │      │
│  │           │    │ transform │    │ Phone Matching   │      │
│  │ 25+ prof. │    │ cosine    │    │ Union-Find       │      │
│  └──────────┘    │ similarity│    └────────┬─────────┘      │
│                  └───────────┘             │                  │
│                                            ▼                  │
│  ┌─────────────────┐    ┌──────────────────────────┐        │
│  │  RISK SCORER     │◀───│  GRAPH BUILDER            │        │
│  │                  │    │                          │        │
│  │ Centrality 40%   │    │  NetworkX                │        │
│  │ Intent    35%   │    │  Nodes: Accounts+Wallets │        │
│  │ Connect.  25%   │    │  Edges: shared_wallet,   │        │
│  │                  │    │         promotes, phone  │        │
│  │ Score 0-100     │    └──────────────────────────┘        │
│  └────────┬────────┘                                         │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────┐        │
│  │           STREAMLIT DASHBOARD                    │        │
│  │                                                  │        │
│  │  Shadow-Graph │ Leaderboard │ NLP Lab │ Profiles │        │
│  │  (PyVis)      │ (Ranked)    │ (Live)  │ (Detail) │        │
│  └──────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI | REST API serving all endpoints |
| **NLP** | sentence-transformers (`all-MiniLM-L6-v2`) | Semantic intent scoring via cosine similarity |
| **Graph** | NetworkX | In-memory graph construction & centrality computation |
| **Visualization** | PyVis | Interactive shadow-graph rendering |
| **Frontend** | Streamlit | Rapid dashboard deployment |
| **Data Models** | Pydantic | Type-safe API schemas |
| **Language** | Python 3.10+ | Full stack |

---

## 📊 Data Architecture

### Mock Dataset (25 profiles)

| Archetype | Count | Description |
|---|---|---|
| 🟢 **Benign Users** | 10 | Fitness, food, travel, yoga, tech, photography, music, gardening, chef, startup |
| 🟡 **Isolated Sellers** | 5 | Solo operators in different cities (Chennai, Hyderabad, Mumbai) |
| 🔴 **Organized Network** | 5 | Share ETH wallet `0x742d...bD68` across Telegram/Instagram/Twitter + runner + promoter |
| 🟡 **Secondary Network** | 3 | Mumbai party scene sharing separate wallet |
| 🟡 **Small Network** | 2 | DarkNet vendor + Pune associate sharing wallet |

### Anchor Sentences (Intent Reference)
1. "Selling premium product, DM for prices and delivery"
2. "Fresh stock available, fast delivery guaranteed"
3. "Wholesale available, bulk deals for regulars"
4. "Product ready for pickup, payment in crypto only"
5. "Best quality in town, contact for menu and pricing"

---

## 🚀 Demo Flow

```
1. Load Data       → Ingest 25 profiles, 60+ posts
2. NLP Scoring     → Flag 15+ suspicious posts  
3. Identity Merge  → Resolve 25 profiles → ~18 identities
4. Graph Build     → 30+ nodes, 25+ edges
5. Risk Ranking    → Top 3 are organized network members
6. Live Demo       → Type coded message → watch intent score spike
```

### The "Wow Moment"
> The Shadow-Graph builds live → Red-clustered nodes emerge → Click a node → See all linked accounts → Realize the "lifestyle influencer" on Instagram is the same person running the Telegram drug bot. **One wallet. One identity. Caught.**

---

## 📈 Expected Impact

| Dimension | Impact |
|---|---|
| **For Law Enforcement** | Reduces weeks of manual cross-referencing to minutes |
| **Scalability** | Platform-agnostic — same logic extends to TikTok, WhatsApp, etc. |
| **Deployment Path** | Designed for CCTNS (India) or INTERPOL I-24/7 integration |
| **Broader Applications** | Counterfeit goods, financial fraud, human trafficking networks |

---

## ⚖️ Ethical Considerations

- Uses **exclusively synthetic/mock data** for demonstration
- Analyzes only **publicly available information**
- Does not surveil the general public
- Designed as **analyst-assist**, not autonomous decision-making
- Compliant with lawful intelligence gathering frameworks

---

*D-TRACK — Connecting dots that criminals deliberately scatter.*
