# 061: Difficulty-rated XP — LLM judges difficulty, engine assigns XP

## Context

Today `resolveXpAward` (`src/agents/xp.ts`) asks the LLM to do math: the engine computes an `XPBudget` band (`resolveXPBudget`) and the LLM proposes an integer `xpAmount` inside it, which the server clamps. That spends tokens on budget context and numeric reasoning, and the number is effectively arbitrary within the band.

This ticket inverts the roles, per the direction agreed during the epic 040 data-integrity review (it supersedes the XP half of **040.7**; the loot half of 040.7 is unchanged):

- The **LLM makes exactly one judgment call**: rate how difficult the accomplishment was *for this party* — `easy | medium | hard | extreme | impossible`.
- The **engine owns all math**: XP = fixed fraction of the character's current level-up span (`LEVEL_XP_THRESHOLDS` gap), keyed by difficulty. A medium encounter is worth the same *fraction* of a level at level 2 and level 12, which also fixes the old system's high-level stall (a level-5+ encounter under the budget formula was worth under 1% of a level).
- **Narration is templated** per difficulty/source — no LLM prose, and the difficulty response is a tiny JSON object with a small `maxTokens` cap.

Applies to both XP sources (`encounter_end`, `quest_complete`) — one code path, same as today.

## Engine XP table (fraction of current level's XP span)

| Difficulty | Fraction |
|------------|----------|
| easy | 5% |
| medium | 10% |
| hard | 20% |
| extreme | 35% |
| impossible | 60% |

~10 medium encounters (or a mix with quests) per level, at any level. At max level the last threshold gap is used (XP still accrues, no level change).

## Scope

- `src/shared/progression/types.ts` — `ENCOUNTER_DIFFICULTIES`, `EncounterDifficulty`, `parseXpDifficultyAgentResponse` (case-insensitive); remove `XpAwardAgentResponse`/`parseXpAwardAgentResponse`; add optional `partyMembers` to `XPContext` so the prompt can describe party comp
- `src/engine/difficultyXp.ts` (new, pure) — `resolveDifficultyXP(difficulty, playerLevel)`, `fallbackDifficulty(ctx)` (schema-exhaustion default: `hard` for major quests, else `medium`), `difficultyXpNarration(difficulty, source)` templates, `shouldSkipXpPass(ctx)` (encounter with zero earning foes)
- `src/engine/xpBudget.ts` — deleted (band math superseded; no production consumers remain)
- `src/agents/xp.ts` — prompt asks for difficulty only; response parsed against the enum; explicit `maxTokens` cap; engine computes amount + narration
- `src/main/xpAwardPersistence.ts` — `xp_awarded` event payload carries `difficulty` instead of `clamped`
- `src/main/encounterXpContext.ts` / `src/main/questXpContext.ts` — include party members (archetype + level) in context
- `src/shared/progression/SPEC.md` — budget section replaced with difficulty rating

## Acceptance Criteria

- [x] Pure engine tests: XP monotonic in difficulty, scales with level span, max-level behavior defined, minimum 1 XP
- [x] Agent returns difficulty only; invalid/unknown difficulty retries up to `MAX_SCHEMA_ATTEMPTS`; exhaustion falls back to deterministic `fallbackDifficulty` (never throws mid-reward)
- [x] `provider.generate` for XP passes an explicit small `maxTokens` (asserted via mock provider)
- [x] Prompt contains party comp (player level + party member archetypes/levels) and foe/quest summary; no budget numbers
- [x] `xp_awarded` event payload includes `difficulty`; play-feed rendering (`narrationLog.ts`) unaffected
- [x] Level-up ceremony flow unchanged (threshold crossing still queues ceremonies)
- [x] Encounter with only fled foes still awards nothing (skip path preserved)
- [x] `npm test`, `npm run lint`, `npm run build` pass
