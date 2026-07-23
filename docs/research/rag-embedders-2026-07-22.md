# RAG embedders research (2026-07-22)

Epic **154** spike: pin local neural stack + cloud embedding APIs for campaign SQLite RAG. Replaces the hashed bag-of-words `local` embedder from **083**.

## Local neural (desktop offline)

| Field | Recommendation |
|-------|----------------|
| Model | `all-MiniLM-L6-v2` (sentence-transformers) |
| ONNX packaging | `onnx-community/all-MiniLM-L6-v2-ONNX` (Transformers.js / Hugging Face) |
| Dimension | **384** |
| Max sequence | ~256 tokens (model card); truncate longer campaign chunks |
| On-disk size | ~80–90 MB (ONNX + tokenizer) |
| RAM at load | ~150–300 MB working set (CPU); no GPU required |
| License | Apache-2.0 (upstream MiniLM / sentence-transformers) |
| Runtime | `@huggingface/transformers` (Transformers.js) in Electron main/Node — downloads/caches under app `userData/rag-embedder/` |
| Idle policy | **Unload after 5 minutes** idle when embed queue empty; cold start OK (~1–3s). Never unload mid-batch. |

### Why this model

- Small enough for on-rails download (mirrors **020** lean-installer constraint).
- Mature ONNX + JS path; mobile ports can reuse the same ONNX weights with platform runtimes later.
- 384-d is a clear break from legacy hash **256-d** → forces honest re-embed migration.

### Acquire layout (target)

```
userData/rag-embedder/
  models/all-MiniLM-L6-v2-ONNX/   # hub files / transformers.js cache
  state.json                     # downloadState, modelId, readyAt
```

Do **not** ship weights inside the installer `.exe`.

## Cloud embeddings (first-class)

Reuse Settings API keys from epic **113**. Same `Embedder.embed(texts)` contract as local — no Electron imports in adapters.

### OpenAI

| Field | Value |
|-------|-------|
| Endpoint | `POST https://api.openai.com/v1/embeddings` |
| Auth | `Authorization: Bearer <openaiApiKey>` |
| Default model | `text-embedding-3-small` |
| Native dim | 1536 (request `dimensions: 384` optional to shrink storage; **v1 stores native 1536** unless Settings overrides) |
| Max input | 8192 tokens |
| Notes | Batch via `input: string[]`. OpenAI-compatible shape. |

### Google Gemini

| Field | Value |
|-------|-------|
| Endpoint | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent` (or `batchEmbedContents`) |
| Auth | `x-goog-api-key: <geminiApiKey>` query/header |
| Default model | `text-embedding-004` |
| Dimension | **768** (model default) |
| Notes | Map each text → embedding values array; batch when available. |

### Grok / xAI — **ruled out (v1)**

xAI does **not** expose a public standalone embeddings API (chat/completions only; Collections indexing is not a drop-in `embed(texts)`). Same honesty rule as Claude for image gen: **omit from Settings cloud embedder list** until a real embeddings endpoint exists. Players on Grok-for-LLM can still pick OpenAI/Gemini for embeddings or use local neural.

### Anthropic Claude — **ruled out**

No public text-embeddings API. Omit.

## Hash / lexical baseline vs neural

| Case | Lexical hash (256-d) | Neural / cloud |
|------|----------------------|----------------|
| Exact keyword overlap | Often OK | OK |
| Paraphrase (“the keep burned” vs “fortress destroyed by fire”) | Weak / miss | Strong win |
| Synonym-only queries | Weak | Win |
| Typos / morphology | Weak | Better |

Hybrid rank in **083** weights “semantic” at 0.7 — only honest once neural/cloud vectors are active.

## Dimension / vector-space rules

- Persist `embedder_id`, `model_id`, `embedding_dim` on each `rag_chunks` row (migration **v57**).
- **Never** cosine-compare across different embedder_id/model_id/dim.
- Switching mode or model → wipe or mark stale → backfill re-embed.
- Legacy hash rows: `embedder_id = lexical`, `model_id = hashed-bow-v1`, `embedding_dim = 256`.

## Mobile-ready contract

- `Embedder` interface + cloud HTTP adapters live under `/db/rag` (and shared settings types) with **no** `userData` / Electron imports.
- Local acquire/paths stay in `/main` (or a thin path injector). Mobile later: cloud adapters + same settings shape; local ONNX via platform runtime.

## Idle unload (local)

Default **300_000 ms** idle after last successful `embed` when no in-flight work. Document as `RAG_LOCAL_IDLE_MS` tunable. Cold start acceptable.

## CI

- Unit tests: `fake` embedder only (+ mocked HTTP for cloud).
- Never download MiniLM or call live vendor APIs in `npm test`.
