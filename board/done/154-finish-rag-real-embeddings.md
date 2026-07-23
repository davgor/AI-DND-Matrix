# EPIC: Finish RAG — real local + cloud semantic embeddings

Epic **083** shipped the full RAG stack (chunk schema, index-on-write, backfill, hybrid retrieve, DM/NPC/party wiring) but the production **`local` embedder is hashed bag-of-words / n-grams** (`embedHashedText` in `src/db/rag/localEmbedder.ts`). Cosine “semantic” scores are lexical hashing, not neural meaning. README and smoke still describe **semantic RAG**.

This epic **finishes** RAG with **two first-class embedder paths**:

1. **Local neural** — offline-capable model on rails (download → ready, lean installer)
2. **Cloud** — OpenAI / Gemini embedding APIs using existing Settings keys (Grok ruled out — no public embeddings API)

Cloud is **not** a stretch: a future **mobile import** will lean on cloud embeddings, so the `Embedder` contract, Settings mode, dimension/version metadata, and re-embed rules must treat cloud as equal to local from day one (desktop ships both; mobile can reuse the same interfaces later).

Also: re-embed existing chunks, keep fake embedder for CI, prove retrieval quality beyond keyword overlap.

Builds on **083** (pipeline stays), **020** / **152** (download-to-`userData` + multi-cloud Settings patterns), **113** (API keys), **040** (token budgets unchanged).

Broken down into sub-tickets **154.1–154.10**. Done when all are complete (including **154.8**).

**Progress (2026-07-23):** All sub-tickets 154.1–154.10 complete; epic collapsed.

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

## Definition of done

- Production local embedder is a real offline neural (or equivalent) model, not bag-of-words hashing
- Production cloud embedder adapters ship for supported vendors (OpenAI, Gemini; Grok ruled out)
- Settings can select local vs cloud as equal modes; readiness and re-embed work for both
- Shared embedder contract + metadata are mobile-portable (no Electron-only types in the core interface)
- Model + runtime acquire into `userData` on rails for local; lean installer preserved
- Dimension / vector-space migration + full re-embed when embedder or model changes
- Fake embedder remains CI default; cloud covered with mocked HTTP tests
- Fallback path when assets/keys missing is tested and documented
- Quality smoke/eval demonstrates paraphrase win vs hash; cloud path covered in runbook
- README / SPEC / runbook language matches reality
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; **act** CI (`pr-checks`, `deadcode`) succeeds

## Sub-tickets

### 154.1 — Research spike: local runtime + cloud embedding APIs

Part of epic **154**. See `docs/research/rag-embedders-2026-07-22.md`.

#### Acceptance criteria

- [x] `docs/research/rag-embedders-2026-07-22.md` covers local reference model + cloud vendors
- [x] Per-vendor embedding model recommendations and dimensions documented
- [x] Claude included or explicitly ruled out (no embeddings API)
- [x] Grok/xAI explicitly ruled out (no public embeddings API)
- [x] Hash vs neural expected win cases noted
- [x] Idle unload / keep-warm recommendation for local (cold start OK if chosen)

### 154.2 — Embedder names, dimensions, and migration contract

Part of epic **154**. Types + selectEmbedder + SPEC migration plan. Cloud adapters are **154.8**; local neural is **154.4**.

#### Acceptance criteria

- [x] Types/SPEC updated: neural local, cloud vendors, lexical, fake
- [x] Unit tests: selecting unknown embedder fails clearly
- [x] Migration plan written for existing `rag_*` embedding blobs (version / embedder id column or wipe+backfill)
- [x] Core `Embedder` interface has no Electron/`userData` imports
- [x] `local` env/name aliases to `lexical` for backward compatibility
- [x] Schema v57 adds embedder_id / model_id / embedding_dim

### 154.3 — Curated local download + acquire into userData

Part of epic **154**. In-app download of the pinned local MiniLM model (+ runtime cache). Progress, ready/failed states, lean-installer constraint.

#### Acceptance criteria

- [x] Download manager tests (progress / failure / ready) without real network in CI (mock fetch)
- [x] Assets under documented `userData` path (`userData/rag-embedder/`)
- [x] Missing assets → ready=false, no throw on app boot
- [x] IPC for start download + status snapshot; persist ready path into Settings
- [x] Full acquire sufficient for Transformers.js / neural runtime (not just config.json marker)

### 154.4 — Neural local `Embedder` implementation

Part of epic **154**. Production local embedder using acquired MiniLM ONNX assets via Transformers.js. Hash implementation remains explicit `lexical` fallback only.

#### Acceptance criteria

- [x] `createLocalNeuralEmbedder` with batch `embed(texts)`, dim 384, `name: 'local_neural'`
- [x] Integration-style unit test with tiny fixture vectors **or** gated optional test skipped in CI if model absent
- [x] Deterministic-enough behavior for same text → same vector (document float tolerance)
- [x] Selection prefers configured ready local neural when mode is local
- [x] Idle unload after ~5 min (`RAG_LOCAL_IDLE_MS`)

### 154.5 — Re-embed / backfill existing campaigns

Part of epic **154**. On open, mode/model change, or Settings action: rebuild chunks whose embedder version/dim/model mismatches. Progress-safe; per campaign DB.

#### Acceptance criteria

- [x] Backfill tests force re-embed on version/mode bump (call counts via fake or mocks)
- [x] Search after rebuild uses only new-space vectors
- [x] Partial failure leaves fallback intact (no silent mixed index)
- [x] Invalidate / clear backfill state API when active embedder meta changes

### 154.6 — Settings: mode picker + readiness

Part of epic **154**. Settings UI: **Local** vs **Cloud** (vendor + embedding model), local download controls, status (Ready / Needs setup / Using fallback). Reuse cloud API key state from LLM Settings.

#### Acceptance criteria

- [x] Component/IPC tests for mode switch + status snapshot (no secret leakage)
- [x] Copy never calls hash-only mode “semantic”
- [x] Cloud mode blocked/Needs setup when key missing; local mode Needs setup when assets missing
- [x] Persist `RagEmbedderSettings` in settings store + preload API

### 154.7 — Quality eval + smoke runbook

Part of epic **154**. Offline eval proving neural (or recorded neural vectors) beats hash. Runbook covers local download path **and** cloud path.

#### Acceptance criteria

- [x] Eval suite CI-safe (fixtures / recorded vectors OK)
- [x] Manual smoke: local download → retrieve paraphrase hit (runbook)
- [x] Manual smoke: cloud mode with key → embed + retrieve (or documented skip if no key)
- [x] Fallback behavior documented

### 154.8 — Cloud RAG embedder adapters (OpenAI + Gemini)

Epic **154** sub-ticket: HTTP adapters for OpenAI and Gemini embedding APIs behind the portable `Embedder` contract.

#### Description

Implement `createOpenAIEmbedder` and `createGeminiEmbedder` under `src/db/rag/cloud/` with mocked-fetch unit tests. No Electron imports, no live network in CI.

#### Acceptance criteria

- [x] `createOpenAIEmbedder` — POST OpenAI embeddings API; dim 1536; `name`/`modelId` set
- [x] `createGeminiEmbedder` — POST Gemini embed API; dim 768; `name`/`modelId` set
- [x] Success maps API response → `number[][]` of correct dimension
- [x] Auth failure (401) → typed/clear Error
- [x] Network throw → clear Error
- [x] Dimension mismatch → clear Error
- [x] Empty apiKey → throw on create or embed
- [x] Exported from `src/db/rag/index.ts`
- [x] New vitest files pass (`npx vitest run` on cloud embedder tests)

### 154.9 — README / SPEC truth-up

Part of epic **154**. Accurate language for local neural + cloud modes + lexical fallback. Point **083** at **154**.

#### Acceptance criteria

- [x] README features / roadmap blurb updated
- [x] `src/db/rag/SPEC.md` embedder section matches implementation (local + cloud)
- [x] Epic **083** follow-through note remains accurate

### 154.10 — Delivery gate

Part of epic **154**.

#### Acceptance criteria

- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [x] `act` workflows `pr-checks.yml` and `deadcode.yml` succeed
- [x] All 154.1–154.9 criteria checked (including **154.8**); epic moved to `board/done/`
