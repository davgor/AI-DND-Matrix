# RAG over campaign SQLite — retrieval contract

Semantic retrieval layer for agent grounding. SQLite remains the source of truth; RAG only selects which existing rows enter prompts. Embeddings live in `/db`; `/engine` stays free of Electron/LLM/embedder imports.

Companion tickets: **083.2** embedder · **083.3** schema · **083.4** index-on-write · **083.5** backfill · **083.6** search API · **083.7–083.8** context wiring · **083.9** hybrid rank · **083.10** cascade · **083.11** smoke.

## Scope model

| Scope | Meaning | Typical filters |
|-------|---------|-----------------|
| `campaign` | All corpora for a campaign | `campaign_id` |
| `region` | Lore tied to a region (facts, region history, region-tagged events) | `campaign_id` + `region_id` |
| `npc` | One NPC's private memories + world facts allowed for that NPC (region/faction tags) | `campaign_id` + `npc_id` (+ optional `region_id` / `faction_tag`) |
| `character` | Player-character grounding (log book / journal / relationship events) | `campaign_id` + `character_id` |

Optional **faction tag filter**: when set, world-fact candidates may also match `faction_tag` (same string convention as today's `listWorldFactsByRegionOrFaction`).

Agents pass the narrowest scope that matches isolation rules. Cross-NPC memory leakage is a hard fail: scope `npc` with `npcId = A` must never return `npc_memories` rows for NPC B.

## Corpus inventory (RAG-eligible)

These tables/fields may be chunked, embedded, and retrieved. One source row → one chunk by default (bounded slices for long history if needed later).

| Source | Table | Text field(s) | Default scopes | Notes |
|--------|-------|---------------|----------------|-------|
| World facts | `world_facts` | `content` | `campaign`, `region`, `npc` (when region/faction allows) | Written by DM side effects; **not** in DM narration context today — primary RAG win for DM |
| NPC memories | `npc_memories` | `content` | `npc` only | Isolation: never retrieve under another NPC's scope |
| Region history | `region_history` | `content` | `campaign`, `region` | Seeded at generation; compressed summaries replace slices |
| Events (narration-bearing) | `events` | narration/summary strings inside `payload` JSON | `campaign`, `region`, `character` (when payload ties to character) | Prefer rows with usable narration text; skip pure mechanical noise when chunking |
| Log book | `log_entries` | `title` + `content` | `character` | Per-character knowledge; already windowed for DM (`LOG_ENTRIES_PER_CATEGORY_LIMIT = 5`) |
| Journal | `character_journal_entries` | `content` | `character` | First-person notes; used lightly for grounding today |

Chunk metadata must retain stable pointers: `source_table`, `source_id`, plus nullable `region_id` / `npc_id` / `character_id` for filtered search.

## Always-on (non-RAG) fields

These stay injected by context assembly regardless of retrieval scores. Do **not** replace them with RAG hits.

| Field / slice | Why always-on |
|---------------|---------------|
| Engine outcomes (check/damage/death resolution) | Authoritative; agents narrate, never invent |
| Combat summary / encounter state | Live mechanical state |
| Present NPC id list (`{ id, name }`) | Scene presence, not lore ranking |
| Region status / description for current region | Current scene anchor |
| Primary story thread | Active arc pointer |
| Active quests (capped, `MAX_ACTIVE_QUESTS_IN_CONTEXT = 3`) | Actionable objectives |
| Known spells window (`MAX_KNOWN_SPELLS_IN_CONTEXT = 8`) | Mechanical repertoire |
| Currency, HP, abilities, equipment slots | Character sheet truth |
| Alignment / temperament / speaking style | Identity, not searchable lore |
| Equipped weapon / damage profile | Combat resolution |

Recency/tag windows from epic **006** / **040** remain the **fallback** path (below), not the primary relevance path once the index is warm.

## Query contract (logical)

```ts
retrieveRelevantChunks({
  db,
  campaignId,
  query,           // usually playerInput or scene summary text
  scope,           // 'campaign' | 'region' | 'npc' | 'character'
  scopeIds,        // { regionId?, npcId?, characterId?, factionTag? }
  k,               // top-k before hybrid budget trim
  embedder
}) => Array<{ sourceTable, sourceId, text, score, … }>
```

Context assemblers map hits into existing slim serializers (`slimWorldFacts`, `slimEvents`, `windowNpcMemories`, log-book windowing) and still respect epic **040** budgets:

| Budget | Value | Where |
|--------|-------|-------|
| Event recency window | `DEFAULT_RECENCY_WINDOW = 20` | `contextWindow.ts` |
| Event text cap | `EVENT_TEXT_MAX_LENGTH = 300` | `contextSlim.ts` |
| World fact budget | min 10 / max 30 / 2000 chars | `WORLD_FACT_BUDGET` |
| NPC memory budget | min 20 / max 60 / 3000 chars | `NPC_MEMORY_BUDGET` |
| Log entries per category | 5 | `logBookWindow.ts` |
| Narration user prompt smoke ceiling | ~2600 chars | `docs/runbooks/llm-efficiency-smoke-test.md` |

Hybrid ranking (semantic + tag match + recency boost) and a hard chunk-injection cap are specified under **083.9** (below).

## Fallback behavior

If **any** of the following hold, context assembly must behave like today's recency/tag path (no throw, no empty lore when the DB has rows):

1. **Index empty** — no `rag_chunks` (or equivalent) for the campaign / requested scope (new save before backfill, or corpora not yet indexed).
2. **Embedder unavailable** — selection fails, embed throws, or dimension mismatch.
3. **Retrieval returns `[]`** while source tables still have rows — treat as miss; fall back rather than starving the prompt.

Fallback mapping (match current loaders):

| Agent | Fallback |
|-------|----------|
| DM narration | `listEventsByCampaign` → `takeRecent(20)` + log-book window; do not invent world_facts/region_history if they were never assembled before — once RAG is wired, DM may include those corpora via RAG or an explicit always-inject subset; empty RAG must not remove always-on fields |
| NPC | `listNpcMemoriesByNpc` + `listWorldFactsByRegionOrFaction` → budget windows |
| Party member | relationship events `takeRecent(20)` + optional source-NPC memory window |

CI and unit tests use a scripted/fake embedder only — never a network embedder.

## Isolation rules (binding)

1. Scope `npc` + `npcId`: memory chunks only for that `npc_id`.
2. World facts under NPC scope: only rows matching that NPC's `region_id` or allowed `faction_tag` (same as today).
3. Scope `character`: log/journal/events for that character; never another character's private journal/log, never foreign `npc_memories`.
4. Delete/cascade (**083.10**) must remove chunks with their source rows / campaign.

## Hybrid rank (083.9)

Agent callers use `retrieveForContext` / `retrieveWithHybridRank` (`retrieveHybrid.ts`) instead of raw `retrieveRelevantChunks` when assembling lore.

| Constant | Value | Rationale |
|----------|-------|-----------|
| `RAG_CHUNK_INJECTION_CAP` | 12 | Keeps retrieved chunks below epic **040** serialized lore budgets (~30 world facts / ~60 NPC memories) and narration smoke (~2600 chars user prompt) |

**Hybrid score** (`hybridRankScore` in `hybridRank.ts`):

```
semanticScore * 0.7 + (tagMatch ? 0.2 : 0) + (recencyScore ?? 0) * 0.1
```

- **Semantic** (0.7) — primary signal from cosine similarity once the index is warm.
- **Tag match** (+0.2) — optional boost when `tagMatchedSourceIds` contains the chunk's `sourceId` (e.g. faction/region tag alignment).
- **Recency** (+0.1 × normalized score) — optional tie-breaker from caller-supplied `recencyBySourceId` (0..1, newer = higher).

Flow: fetch up to `max(cap * 2, k)` semantic candidates → merge tag/recency metadata → sort by hybrid score → slice to `cap` (default 12).

**Embedder failure:** `retrieveForContext` catches embedder throws and returns up to `cap` scoped chunks ordered by `updated_at DESC` with `score: 0` (recency fallback; no throw, bounded context).

## Non-goals (this epic)

- Cloud vector DBs as primary store
- Embedding the **023** catalog as first corpus
- Replacing engine or catalog mechanical retrieval with LLM+RAG
- Cross-campaign shared vector stores
