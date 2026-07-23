# RAG retrieval smoke test

Validates epic **083** pipeline + epic **154** real embedder modes (local neural / cloud / lexical fallback), plus interaction with epic **040** prompt-size / injection budgets.

## Automated smoke

```bash
npx vitest run src/db/ragSmoke.test.ts
npx vitest run src/db/rag/qualityEval.test.ts
```

Also covered by unit suites under `src/db/rag/` and agent wiring tests:

- `src/agents/dmRagContext.test.ts` — DM relevance + always-on fields
- `src/agents/npcRagContext.test.ts` — NPC memory isolation
- `src/agents/partyMemberRagContext.test.ts` — party-member source-NPC isolation
- Cloud adapters: `src/db/rag/cloud/*.test.ts` (mocked HTTP)
- Local download: `src/main/rag/modelDownload.test.ts` (mocked fetch)

## Relevance regression (083 fake)

The smoke suite plants a world fact with a fixture embedding, queries with a **paraphrase** that shares the same vector, and asserts the planted `sourceId` appears as the top hit (over an orthogonal distractor).

## Quality eval (154.7)

`qualityEval.test.ts` compares recorded neural-space paraphrase ranking against lexical hashing on the same wording pair. CI never downloads MiniLM or calls live cloud APIs.

## Fallback behavior

| Condition | Behavior |
|-----------|----------|
| RAG embeddings disabled in Settings | Recency/tag path; lexical only if explicitly selected |
| Local neural selected but model not downloaded | Needs setup; resolve falls back to lexical |
| Cloud selected but API key missing | Needs setup; resolve falls back to lexical |
| Embed / network failure mid-turn | Context assembly keeps recency/tag fallback; no crash |
| Mode/model change | Wipe campaign RAG index + re-backfill (`invalidateCampaignRagForEmbedderChange`) so spaces never mix |

## Manual smoke — local neural

1. Settings → **Memory / RAG embeddings** → enable → **Local neural (MiniLM)**.
2. Click **Download local model** (~90 MB into `userData/rag-embedder/`). Wait for Ready.
3. Open a campaign, ensure backfill runs (or write a world fact).
4. Ask about a fact using **different wording** than the stored text (paraphrase).
5. Confirm DM grounding retrieves the fact (or check SQLite `rag_chunks.embedder_id = local_neural`).

## Manual smoke — cloud (OpenAI or Gemini)

1. Set the matching LLM API key under Settings (epic **113** keys are reused).
2. Memory / RAG embeddings → **Cloud — OpenAI** or **Cloud — Gemini** → enable → Ready.
3. Open a campaign; write or backfill a fact; query with a paraphrase.
4. If no API key in the QA environment, **skip** and note it in the QA log — mocked unit tests still cover adapters.

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
