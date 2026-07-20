# RAG retrieval smoke test

Validates epic **083**: semantic retrieval over campaign SQLite corpora, plus interaction with epic **040** prompt-size / injection budgets.

## Automated smoke

```bash
npx vitest run src/db/ragSmoke.test.ts
```

Also covered by unit suites under `src/db/rag/` and agent wiring tests:

- `src/agents/dmRagContext.test.ts` — DM relevance + always-on fields
- `src/agents/npcRagContext.test.ts` — NPC memory isolation
- `src/agents/partyMemberRagContext.test.ts` — party-member source-NPC isolation

## Relevance regression

The smoke suite plants a world fact with a fixture embedding, queries with a **paraphrase** that shares the same vector, and asserts the planted `sourceId` appears as the top hit (over an orthogonal distractor).

## Interaction with epic 040 budgets

| Guard | Value | Where |
|-------|-------|-------|
| RAG chunk injection cap | `RAG_CHUNK_INJECTION_CAP = 12` | `src/db/rag/hybridRank.ts` |
| DM lore JSON char cap | `DM_RAG_LORE_SERIALIZED_CHAR_CAP = 4000` | `src/agents/dmRagContext.ts` |
| Narration user prompt ceiling | **2600** chars (040 slim fixture) | `docs/runbooks/llm-efficiency-smoke-test.md` |

RAG must not regress slim-context goals: assemblers trim to the injection cap before prompt build; empty index / embedder failure falls back to today's recency/tag path (see `src/db/rag/SPEC.md`).

## Manual play checks (optional)

1. Open a long-running save (or seed many world facts), ask about an older causally important fact.
2. Confirm DM Scene grounding mentions that fact even when recent events are unrelated chatter.
3. Confirm two NPCs with private memories do not leak across Social replies.
