# EPIC: RAG over campaign SQLite (semantic retrieval for agent grounding)

Today every agent call is re-grounded from SQLite, but retrieval is mostly **recency caps + tag filters** (`world_facts` by region/faction, last-N events / `npc_memories` / `region_history`). That works early in a campaign and fails as history grows: relevant older facts fall out of the window, unrelated recent noise burns tokens, and tag miss means the model never sees the fact.

This epic adds a **local-first RAG layer over campaign DB content** so context assembly can pull the most relevant rows for the current player input / scene, within a hard token budget — without sending chat history as the source of truth, and without breaking NPC memory isolation.

Builds on **003** (persistence), **006** (context assembly + isolation + recency windows), **023** (catalog retrieve-first — filter/rank, not embeddings), and complements **040** (token efficiency: RAG is the relevance half of slim prompts; 040's caps/windowing remain the budget half).

## Problem

- Recency windows drop causally important older state (burned village, sworn oath, dead NPC) when newer chatter fills the cap.
- Tag-only `world_facts` retrieval misses facts the DM tagged incompletely or that cross region/faction boundaries the current query doesn't know to ask for.
- Catalog retrieval (**023**) is structured filter/rank, not semantic search over free-text campaign lore.
- Epic **040** can shrink prompts but cannot recover relevance that was never selected.

## Design constraints (binding)

- **Local-first / offline-capable.** Embeddings and vector search live in (or beside) the campaign SQLite save. No required cloud embedding API for play; optional remote embedders may exist behind a provider flag but must have a local default path.
- **SQLite remains source of truth.** RAG retrieves existing rows; it never invents facts. Agents still propose; engine/DB still persist.
- **NPC memory isolation unchanged.** Semantic search for NPC agents may only score that NPC's `npc_memories` (+ appropriately tagged world facts). Cross-NPC memory leakage is a hard fail.
- **`/engine` stays pure.** Embedding + retrieval live in `/db` (and thin main/agent callers); no Electron/LLM imports in `/engine`.
- **Deterministic tests.** Unit tests use a fake/scripted embedder; no live network in CI.
- **Budget-aware.** Retrieval returns a ranked, capped set; context serializers still respect **040** slim shapes and token ceilings.
- **Write-path indexing.** New durable text (facts, memories, history, events, log book, etc.) is embedded on persist (or queued); existing campaigns get a one-shot backfill migration/job.

## Definition of done

- Campaign text corpora are chunked, embedded, and stored with stable links back to source rows
- A typed retrieval API returns top-k relevant chunks for a query + scope (campaign / region / NPC / character)
- DM, NPC, and party-member context assembly use RAG for lore/history selection (recency may remain as a boost or fallback, not the only path)
- NPC isolation and campaign delete/cascade cover embedding tables
- Backfill works on open for saves that predate the feature
- Smoke/regression documents retrieval quality + prompt-size bounds; `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass

## Sub-tickets

| Id | Title | Status |
|----|-------|--------|
| 083.1 | Retrieval contract and corpus inventory | done |
| 083.2 | Embedding provider interface (local default) | done |
| 083.3 | Schema + migrations for chunks/embeddings | done |
| 083.4 | Chunking + index-on-write | done |
| 083.5 | Backfill job for existing saves | done |
| 083.6 | Similarity search API | done |
| 083.7 | Wire DM narration context assembly | done |
| 083.8 | Wire NPC + party-member context assembly (isolation) | done |
| 083.9 | Hybrid rank + token budget | done |
| 083.10 | Delete/cascade + save integrity | done |
| 083.11 | RAG smoke + relevance regression | done |

## Out of scope (unless promoted later)

- Cloud-only vector DBs (Pinecone, etc.) as the primary store
- Embedding the full preseeded **023** catalog as the first corpus (may reuse the API later; campaign lore is priority)
- Replacing engine resolution or catalog mechanical retrieval with LLM+RAG
- Cross-campaign global memory / multiplayer shared vector stores (**m002**)
