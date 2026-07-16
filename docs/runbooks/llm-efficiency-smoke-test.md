# LLM efficiency smoke test

Validates epic **040**: per-turn LLM call-count ceilings across the turn/combat/reward/NPC-generation hot paths, plus prompt-size regression guards for slim narration context (040.4) and guided-identity transcript windowing (040.10).

## Prerequisites

- `npm install`
- Configured LLM provider in `.env` for the manual steps (`AGENT_PROVIDER`, e.g. `claude` + `CLAUDE_API_KEY`)

## Automated smoke

```bash
npx vitest run src/db/llmEfficiency.smoke.test.ts
```

The suite drives the real turn pipeline (`resolvePlayerTurn`) and the real flagged-NPC generation entry point (`generateFlaggedNpc`) with scripted providers. Any unexpected extra LLM call fails fast (`no more scripted responses queued`), and explicit `provider.calls` asserts document each budget.

## Call budget per scenario

| Scenario | Expected LLM calls | Guarded by |
|----------|--------------------|------------|
| Simple dialogue turn — 1 previously-met NPC, no check, no cross-character signals | **2**: 1 intent-only call (no routing schema) + 1 `npcResponse` call; **0 routing calls** — the 040.3 heuristic converse row fires | 040.2 + 040.3 |
| Check + narration turn | **≤ 2**: 1 merged intent+routing call + 1 `narrate` call | 040.2 |
| Combat player attack with 2 NPC catch-up turns | **1** intent call for the attack turn; **0** catch-up flavor calls (template flavor) | 040.6 |
| Encounter end rewards (enrichment off) | **1** XP difficulty-rating call (64-token cap, engine computes the amount — ticket 061) + **0** loot LLM calls (deterministic selector + template narration); yield also resolves rules-first with 0 calls | 040.7 + 040.8 + 061 |
| Flag a new NPC, race already realized in campaign | **exactly 2**: core bundle + details | 040.13 |
| Flag a new NPC, race not yet realized | **exactly 3**: core bundle + race-lore realize + details | 040.13 |

Combat encounter start costs 1 intent call (asserted in the combat scenarios). The flagged-NPC ceilings are also asserted at their source in `src/agents/campaignGeneration/flaggedNpc.test.ts` (see `docs/runbooks/npc-core-bundle-smoke-test.md`); the smoke suite re-asserts them so any regression fails here with the epic-wide budget in the failure message.

## Prompt-size ceilings

Named constants in `llmEfficiency.smoke.test.ts`, set to measured actual + ~30% headroom (measured 2026-07 on the suite's seeded fixtures):

| Prompt | Measured | Ceiling |
|--------|----------|---------|
| Narration user prompt (`assembleNarrationContext` fixture: 6 events, 2 log entries, world fact, active quest) | 1,985 chars | 2,600 |
| Narration `systemPrompt` (schema + guidance + emphasis, static per call) | 5,454 chars | 7,100 |
| Guided-identity interview user prompt (5-entry window) | 727 chars | 950 |

The identity fixture also proves windowing directly: a 10-turn transcript produces a **byte-identical** user prompt to its last-5 window, and the static identity block (race lore + background + mechanical facts, 1,908 chars on the fixture) rides in `systemPrompt` once per call, never in the per-turn user prompt.

## Opt-in flags (both default off — the budgets above are the defaults)

| Env flag | What `true` restores |
|----------|----------------------|
| `COMBAT_LLM_FLAVOR` | LLM flavor for NPC/party combat catch-up turns (one `generateNpcReaction` / `decidePartyMemberAction` call per catch-up turn) instead of deterministic templates. Manual-QA escape hatch for 040.6. |
| `ENRICH_REWARD_NARRATION` | LLM **loot** selection including `proposeNew` homebrew catalog growth and flavor narration, instead of the zero-LLM template path. Loot-only since ticket 061: XP is always one difficulty-rating call with engine-computed amounts and templated narration (`src/engine/difficultyXp.ts`), regardless of this flag. |

Accepted, intended behavior while both are off: organic homebrew catalog growth via `proposeNew` stops. XP amounts are difficulty-fraction based (ticket 061); `xp_awarded` events carry `difficulty` instead of the old `clamped` flag.

## Adaptive ceilings (040.14 — large NPCs and large DM turns are safe)

The tuned `maxTokens` bands and context windows are optimized for the common case, and two mechanisms keep them from clipping legitimately large content:

- **Output — truncation escalation.** The production provider is wrapped in `withTokenEscalation` (`src/agents/providers/tokenEscalation.ts`): when a response hits its cap (adapter throws a truncation error instead of returning partial text), the same prompt is retried with a doubled cap — at most 2 escalations, absolute ceiling 8,192 tokens (e.g. `narrate` 1024 → 2048 → 4096). Escalation never fires on intentional micro-caps (≤ 8, connectivity pings), and `withRetry` treats truncation as non-retryable so no connectivity retries are burned on it. Cost model: the common case pays the tuned cap; the rare oversized output pays one or two extra calls instead of failing the turn.
- **Input — knowledge-aware window budgets.** NPC world facts and NPC/party memories use `RecencyBudget` windows (`contextSlim.ts`): a guaranteed minimum of the most recent entries (10 facts / 20 memories, unchanged from the fixed windows), then older entries are included while a character budget lasts (2,000 / 3,000 chars), hard-capped at 30 / 60 entries. A knowledge-rich NPC with many short facts and memories carries substantially more of them into its prompt; long-entry NPCs cost no more than before.

## Manual verification (real provider)

1. `npm run dev` with a configured provider and create a small campaign.
2. Play a few turns and watch the dev log — the 040.3 routing-source debug line (`turn routing source` with `source: 'heuristic' | 'llm'`, dev builds only) is the observable:
   - A plain dialogue line to one NPC you have already spoken with (e.g. *"Mira, how are you?"*) should log `heuristic` and produce dialogue with no DM narration.
   - A quest-relevant or transactional line (e.g. *"I buy the rope"*) should log `llm` — the starvation guard defers so `dmNarration` side-effect writes can land.
3. Start a fight with 2+ hostile NPCs and attack: catch-up turns should resolve instantly with short template flavor lines (no per-NPC provider latency). Set `COMBAT_LLM_FLAVOR=true` and repeat to see the LLM flavor path return.
4. Win the encounter: XP narration is a per-difficulty template line (one fast 64-token rating call) and loot narration is an immediate template one-liner. Set `ENRICH_REWARD_NARRATION=true` and repeat to see LLM loot flavor return (XP behavior is unchanged by the flag).
5. In Campaign Review, **Generate NPC** twice with the same race seed: the second generation should be visibly faster (2 calls, race lore reused — no re-realize).

## Recorded run (template)

| Date | Tester | Result | Notes |
|------|--------|--------|-------|
|      |        |        |       |
