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

083.1 retrieval contract + corpus inventory · 083.2 embedding provider interface (local default) · 083.3 schema + migrations for chunks/embeddings · 083.4 chunking + index-on-write for campaign corpora · 083.5 backfill job for existing saves · 083.6 vector / similarity search API · 083.7 wire DM `assembleNarrationContext` · 083.8 wire NPC + party-member assembly (isolation) · 083.9 hybrid rank (semantic + tags + recency) + token budget · 083.10 delete/cascade + save integrity · 083.11 RAG smoke + relevance regression

## Sub-tickets

### 083.1 Retrieval contract and corpus inventory

#### Description

Document which tables/fields are RAG corpora, which stay always-injected (engine-authoritative combat, region status, present NPC ids, active quests, etc.), query/scope types, and failure modes (empty index → recency fallback).

#### Acceptance criteria

- [ ] Spec under `docs/` (or `/db` SPEC) lists corpus sources: at least `world_facts`, `npc_memories`, `region_history`, `events` (narration-bearing), character log book / journal where used for grounding
- [ ] Spec marks non-RAG always-on fields (engine outcomes, combat summary, present NPC id list, currency/HP, etc.)
- [ ] Scope model defined: `campaign` | `region` | `npc` | `character` (+ optional faction tag filter)
- [ ] Explicit fallback: if index empty or embedder unavailable, behavior matches today's recency/tag path

### 083.2 Embedding provider interface (local default)

#### Description

Add a pluggable embedder behind a small interface (batch embed text → `Float32Array` / number[]), with a **local default** suitable for Electron (no cloud required for play). Remote/optional providers may be stubbed or gated by settings but are not required for AC.

#### Acceptance criteria

- [ ] `Embedder` interface: `embed(texts: string[]) => Promise<number[][]>` (or sync equivalent) with fixed documented dimension
- [ ] Local default implementation is selectable without code changes (config / settings flag)
- [ ] Scripted/fake embedder for tests (deterministic vectors from hash or fixture map)
- [ ] Unit tests cover interface selection + fake embedder determinism; CI never calls a network embedder

### 083.3 Schema + migrations for chunks and embeddings

#### Description

Add forward-only migrations for chunk metadata and embedding storage keyed to campaign (and source row), suitable for per-campaign SQLite files.

#### Acceptance criteria

- [ ] Tables (names flexible) cover: chunk id, campaign_id, source_table, source_id, scope keys (region_id / npc_id / character_id nullable), text, embedding blob or equivalent, updated_at / content hash
- [ ] Unique constraint prevents duplicate live chunks for the same source revision (content hash or version)
- [ ] Indices support filtered search by campaign + scope
- [ ] Migration install + upgrade tests pass on fresh and pre-RAG DB files

### 083.4 Chunking + index-on-write

#### Description

When durable grounding text is written, create/update chunks and embeddings. Keep chunks small enough for retrieval (one fact / one memory / bounded history slice).

#### Acceptance criteria

- [ ] Writers for at least `world_facts` and `npc_memories` enqueue or synchronously update RAG chunks on insert/update
- [ ] Content-hash skip avoids re-embed when text unchanged
- [ ] Unit tests: insert fact → chunk row exists; update text → embedding refreshed; unchanged text → no redundant embed call (fake embedder call count)

### 083.5 Backfill job for existing saves

#### Description

On DB open (or first retrieval), backfill embeddings for corpora that lack chunks so older campaigns gain RAG without manual migration steps.

#### Acceptance criteria

- [ ] Idempotent backfill processes pending source rows and marks completion per campaign
- [ ] Large fixture (hundreds of facts/memories) backfills without hanging tests (batch size bounded)
- [ ] Unit test: pre-RAG seeded DB → open/backfill → retrieval finds expected source ids

### 083.6 Similarity search API

#### Description

Typed `/db` retrieval function: embed query (or accept precomputed vector), score against scoped chunks, return top-k with source pointers and text.

#### Acceptance criteria

- [ ] `retrieveRelevantChunks({ db, campaignId, query, scope, k, embedder })` returns ranked hits with `sourceTable`, `sourceId`, `text`, `score`
- [ ] Scope `npc` never returns another NPC's memory chunks (isolation test with two NPCs, similar wording)
- [ ] Empty corpus returns `[]` (no throw)
- [ ] Unit tests with fake embedder prove ranking prefers the planted relevant chunk over distractors

### 083.7 Wire DM narration context assembly

#### Description

Replace or augment recency-only lore slices in `assembleNarrationContext` / related loaders with RAG hits for the current `playerInput` + region scope, still under a hard entry/token cap.

#### Acceptance criteria

- [ ] DM context includes RAG-selected world facts / region history / events (per 083.1 inventory) instead of pure last-N where specified
- [ ] Always-on authoritative fields from 083.1 remain present
- [ ] Unit test: older relevant fact outside the old recency window is included when the query matches; unrelated recent noise is not preferred solely by recency
- [ ] Prompt size stays within documented cap (assert entry count / serialized length bound)

### 083.8 Wire NPC + party-member context assembly (isolation)

#### Description

NPC and party-member agents retrieve semantically relevant memories/facts under the same isolation rules as **006.6** / **006.7**.

#### Acceptance criteria

- [ ] NPC assembly uses RAG over that NPC's memories + allowed world facts only
- [ ] Cross-NPC leakage test fails the build if B's memory appears in A's context
- [ ] Party-member relationship/history grounding can use character/campaign-scoped retrieval without pulling unrelated NPC private memories
- [ ] Unit tests cover both agents with fake embedder

### 083.9 Hybrid rank + token budget

#### Description

Combine semantic score with tag match and recency boost; enforce a single budget so RAG cannot balloon past **040** prompt hygiene goals.

#### Acceptance criteria

- [ ] Ranking function documented and unit-tested (semantic vs tag-only vs recency-only fixtures)
- [ ] Hard cap on chunks injected per agent call (config constant); test with oversized candidate set
- [ ] When embedder fails, fallback path is exercised in a unit test and still returns a bounded context

### 083.10 Delete/cascade + save integrity

#### Description

Campaign/region/NPC deletion and save snapshot/restore remain correct with embedding tables; no orphan chunks.

#### Acceptance criteria

- [ ] Deleting a campaign removes all its chunks/embeddings in the same transaction patterns used today
- [ ] Deleting an NPC removes that NPC's memory chunks
- [ ] Tests extend existing delete-campaign / delete-region coverage for new tables
- [ ] Save snapshot/restore (if embeddings are in-DB) round-trips without duplicate or missing index rows

### 083.11 RAG smoke + relevance regression

#### Description

Add an automated smoke/regression that seeds a known world, queries with paraphrases, and asserts expected source ids appear in top-k — plus documents manual play checks if needed.

#### Acceptance criteria

- [ ] Automated test (fake or local embedder) asserts paraphrase query retrieves the planted fact id in top-k
- [ ] Documents interaction with **040** call-count/prompt-size budgets (RAG must not regress slim-context goals)
- [ ] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass with the epic's code landed

## Out of scope (unless promoted later)

- Cloud-only vector DBs (Pinecone, etc.) as the primary store
- Embedding the full preseeded **023** catalog as the first corpus (may reuse the API later; campaign lore is priority)
- Replacing engine resolution or catalog mechanical retrieval with LLM+RAG
- Cross-campaign global memory / multiplayer shared vector stores (**m002**)
