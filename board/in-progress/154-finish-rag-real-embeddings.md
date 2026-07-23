# EPIC: Finish RAG — real local + cloud semantic embeddings

Epic **083** shipped the full RAG stack (chunk schema, index-on-write, backfill, hybrid retrieve, DM/NPC/party wiring) but the production **`local` embedder is hashed bag-of-words / n-grams** (`embedHashedText` in `src/db/rag/localEmbedder.ts`). Cosine “semantic” scores are lexical hashing, not neural meaning. README and smoke still describe **semantic RAG**.

This epic **finishes** RAG with **two first-class embedder paths**:

1. **Local neural** — offline-capable model on rails (download → ready, lean installer)
2. **Cloud** — OpenAI / Gemini / Grok (and compatible) embedding APIs using existing Settings keys

Cloud is **not** a stretch: a future **mobile import** will lean on cloud embeddings, so the `Embedder` contract, Settings mode, dimension/version metadata, and re-embed rules must treat cloud as equal to local from day one (desktop ships both; mobile can reuse the same interfaces later).

Also: re-embed existing chunks, keep fake embedder for CI, prove retrieval quality beyond keyword overlap.

Builds on **083** (pipeline stays), **020** / **152** (download-to-`userData` + multi-cloud Settings patterns), **113** (API keys), **040** (token budgets unchanged).

Broken down into sub-tickets **154.1–154.10**. Done when all are complete (including **154.8**).

**Progress (2026-07-22):** 154.1 research ✓ · 154.2 types/migration ✓ · 154.3 download manager (partial) · 154.8 OpenAI/Gemini cloud ✓ · Grok ruled out · Remaining: 154.4 neural MiniLM runtime, 154.5 re-embed job, 154.6 Settings UI, 154.7 eval/smoke, 154.9 docs, 154.10 gate

154.1 research (local + cloud) · 154.2 embedder interface + dimension migration · 154.3 local model download/acquire · 154.4 neural local embedder · 154.5 re-embed / backfill migration · 154.6 Settings mode + readiness · 154.7 quality eval + smoke · **154.8 cloud embedder adapters (required)** · 154.9 docs/README truth · 154.10 delivery gate

## Problem

- Agents believe RAG is semantic; similar-meaning, differently-worded facts often miss under hashing.
- Hybrid rank weights “semantic” at 0.7 — misleading when the vector is a bag-of-words hash.
- No path for players to install a real local embedder the way they install a local LLM.
- No cloud embedder path — blocks parity with cloud LLM users and future mobile.

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Local and cloud are both first-class.** Settings selects embedder mode: `local_neural` \| `cloud` (vendor) \| lexical fallback only when nothing else is ready. Neither path is “stretch.” |
| 2 | **Offline desktop still works.** Local neural download remains the offline happy path; cloud requires network + API key. |
| 3 | **Mobile-ready contract.** `Embedder` interface, settings shape, chunk embedder-id / dimension metadata, and re-embed rules must not assume Electron `userData` or ONNX-only — cloud adapters and shared types live where a future mobile client can reuse them (`/shared` + `/db` patterns; no renderer-only embedding logic). Shipping a mobile app is **out of scope**; portable design is **in scope**. |
| 4 | **Hash embedder is not “local semantic.”** Rename/demote hashing to `lexical` / legacy. |
| 5 | **On-rails local acquire.** Curated small embedding model + runtime downloaded into `userData` — lean installer. |
| 6 | **Cloud reuses LLM keys.** OpenAI / Gemini embedding calls use the same Settings API keys as epic **113**. **Grok and Claude are omitted** — no public embeddings API (see research doc). |
| 7 | **Re-embed on embedder/model change.** Switching local↔cloud or model/dim invalidates the vector space; backfill rebuilds. Do not mix incompatible vectors in one search. |
| 8 | **CI stays fake.** Unit tests use `fake` / scripted embedder; cloud tests mock HTTP; no live network or large model in `npm test`. |
| 9 | **Graceful degrade.** Missing local assets / missing cloud key / network failure → documented fallback (recency/tag and/or lexical); never crash context assembly. |
| 10 | **NPC isolation unchanged.** Same hard fail as **083**. |
| 11 | **Settings surface.** Mode picker, local download status, cloud vendor/model, Ready / Needs setup / Using fallback. |

## Target user experience (v1)

1. Settings → **Memory / RAG embeddings**: choose **Local** or **Cloud** (OpenAI / Gemini / Grok as available).
2. **Local:** Download semantic model (size / RAM hints) → Ready → new writes + backfill use neural local.
3. **Cloud:** Pick vendor (key already in LLM Settings or enter here) + embedding model → Ready when key validates.
4. Until ready, play continues with fallback; UI does not claim “semantic” falsely.
5. Switching mode prompts / triggers re-embed of campaign chunks (progress-safe).
6. Smoke / eval: paraphrase retrieval win vs hash; separate smoke for one cloud vendor (mocked in CI, manual live optional).

## Definition of done

- Production local embedder is a real offline neural (or equivalent) model, not bag-of-words hashing
- Production cloud embedder adapters ship for supported vendors (OpenAI, Gemini, Grok at minimum unless research drops one with cause)
- Settings can select local vs cloud as equal modes; readiness and re-embed work for both
- Shared embedder contract + metadata are mobile-portable (no Electron-only types in the core interface)
- Model + runtime acquire into `userData` on rails for local; lean installer preserved
- Dimension / vector-space migration + full re-embed when embedder or model changes
- Fake embedder remains CI default; cloud covered with mocked HTTP tests
- Fallback path when assets/keys missing is tested and documented
- Quality smoke/eval demonstrates paraphrase win vs hash; cloud path covered in runbook
- README / SPEC / runbook language matches reality
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; **act** CI (`pr-checks`, `deadcode`) succeeds

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **083** | Pipeline, schema, hybrid rank, agent wiring — keep; replace embedder + truth docs |
| **020** / **152** | Local download / readiness UX patterns |
| **113** | Multi-cloud API keys reused for cloud embeddings |
| **040** | Injection caps / prompt budgets stay |
| **Future mobile** | Consumers of the same `Embedder` + settings contract; not implemented here |

## Out of scope

- Shipping an iOS/Android app (design for import only)
- Cloud vector DB as primary store (still embed into campaign SQLite)
- Embedding the **023** rules catalog as first corpus
- Replacing engine mechanical retrieval with RAG
- Cross-campaign shared vector stores
- Guaranteeing GPU for local embeddings (CPU ONNX OK if research picks it)

## Sub-tickets

### 154.1 — Research spike: local runtime + cloud embedding APIs

Pin offline stack (model id, dim, size, RAM, license, idle policy) **and** cloud vendor embedding endpoints (URL, auth, model ids, dimensions, rate limits). Note mobile constraints (no ONNX-in-Electron assumption for cloud path).

#### Acceptance criteria

- [ ] `docs/research/rag-embedders-YYYY-MM-DD.md` covers local reference model + cloud vendors
- [ ] Per-vendor embedding model recommendations and dimensions documented
- [ ] Claude included or explicitly ruled out (no embeddings API)
- [ ] Hash vs neural expected win cases noted
- [ ] Idle unload / keep-warm recommendation for local (cold start OK if chosen)

### 154.2 — Embedder names, dimensions, and migration contract

Extend `EmbedderName` / mode beyond `local` \| `fake` to cover neural local, cloud vendors, and lexical legacy. Document dimension per embedder/model; forbid mixing vector spaces without rebuild. Plan content-hash + embedder-id + model-id invalidation. Keep core types portable for future mobile.

#### Acceptance criteria

- [ ] Types/SPEC updated: neural local, cloud vendors, lexical, fake
- [ ] Unit tests: selecting unknown embedder fails clearly
- [ ] Migration plan for existing `rag_*` embedding blobs (version / embedder id column or wipe+backfill)
- [ ] Core `Embedder` interface has no Electron/`userData` imports

### 154.3 — Curated local download + acquire into userData

In-app download of the pinned local model (+ runtime if needed). Progress, ready/failed states, lean-installer constraint.

#### Acceptance criteria

- [ ] Download manager tests (progress / failure / ready) without real network in CI (mock fetch)
- [ ] Assets under documented `userData` path
- [ ] Missing assets → ready=false, no throw on app boot

### 154.4 — Neural local `Embedder` implementation

Implement production local embedder using acquired assets. Batch `embed(texts)` with fixed dimension from research. Hash implementation becomes explicit `lexical` fallback only.

#### Acceptance criteria

- [ ] Integration-style unit test with tiny fixture vectors **or** gated optional test skipped in CI if model absent
- [ ] Deterministic-enough behavior for same text → same vector (document float tolerance)
- [ ] Selection prefers configured ready local neural when mode is local

### 154.5 — Re-embed / backfill existing campaigns

On open, mode/model change, or Settings action: rebuild chunks whose embedder version/dim/model mismatches. Progress-safe; per campaign DB.

#### Acceptance criteria

- [ ] Backfill tests force re-embed on version/mode bump (call counts via fake or mocks)
- [ ] Search after rebuild uses only new-space vectors
- [ ] Partial failure leaves fallback intact (no silent mixed index)

### 154.6 — Settings: mode picker + readiness

Settings UI: **Local** vs **Cloud** (vendor + embedding model), local download controls, status (Ready / Needs setup / Using fallback). Reuse cloud API key state from LLM Settings where possible.

#### Acceptance criteria

- [ ] Component/IPC tests for mode switch + status snapshot (no secret leakage)
- [ ] Copy never calls hash-only mode “semantic”
- [ ] Cloud mode blocked/Needs setup when key missing; local mode Needs setup when assets missing

### 154.7 — Quality eval + smoke runbook

Offline eval (fixture corpus + paraphrased queries) proving neural (or recorded neural vectors) beats hash. Runbook covers local download path **and** cloud path (one vendor manual smoke; CI uses mocks).

#### Acceptance criteria

- [ ] Eval suite CI-safe (fixtures / recorded vectors OK)
- [ ] Manual smoke: local download → retrieve paraphrase hit
- [ ] Manual smoke: cloud mode with key → embed + retrieve (or documented skip if no key in QA env)
- [ ] Fallback behavior documented

### 154.8 — Cloud embedder adapters (required)

First-class `Embedder` implementations for OpenAI, Gemini, and Grok embedding APIs (drop any vendor research rules out). Same `embed(texts)` contract as local. Used when Settings mode is cloud.

#### Acceptance criteria

- [ ] Adapter unit tests with mocked HTTP for success + typed failures (auth, rate limit, network)
- [ ] Maps responses into fixed-dimension vectors; dimension mismatch fails clearly
- [ ] Reuses Settings API keys; does not require a second key store unless product adds one
- [ ] Not Electron-specific — callable from shared/main/db wiring a mobile port could mirror
- [ ] Epic cannot close with this ticket deferred

### 154.9 — README / SPEC truth-up

Accurate language for local neural + cloud modes + lexical fallback. Point **083** at **154**.

#### Acceptance criteria

- [ ] README features / roadmap blurb updated
- [ ] `src/db/rag/SPEC.md` embedder section matches implementation (local + cloud)
- [ ] Epic **083** follow-through note remains accurate

### 154.10 — Delivery gate

#### Acceptance criteria

- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [ ] `act` workflows `pr-checks.yml` and `deadcode.yml` succeed
- [ ] All 154.1–154.9 criteria checked (including **154.8**); epic moved to `board/done/`
