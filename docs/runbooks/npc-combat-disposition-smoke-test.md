# NPC combat disposition smoke test

Manual verification in the dev app after automated `npcCombatDispositionSmoke.test.ts` passes.

## Scenario A — mundane villager

1. Generate or seed a campaign with a speaking NPC whose backstory is mundane (baker/farmer).
2. Confirm campaign review shows backstory, disposition, and alignment together.
3. Attack the NPC in play (`I attack Tom` or similar).
4. Confirm disposition shifts to hostile and combat starts at villager stats.
5. Confirm no extra agent round-trip occurs at encounter start (tier was set at creation).

## Scenario B — unlikely veteran

1. Seed or generate an NPC with an explicit retired-guard backstory.
2. After creation, inspect DB or campaign review optional tier badge — stats should exceed villager baseline.
3. Start combat — encounter should read existing `combat_tier` with no review call.

## Scenario C — defeat dispositions

1. Lose a fight vs a lawful-good guard-captain NPC with guard backstory on file → imprison banner and imprisoned status.
2. Lose vs chaotic-good reformed-bandit backstory → bury-out-back narration (Standard mode rewinds; Legendary persists outcome text).

**Rules-first (040.8):** speaking-victor dispositions are decided by a pure decision table (`src/agents/defeatRules.ts`) over victor alignment + backstory/role keywords + campaign death mode, with zero LLM calls for keyword-matched cases (both scenarios above resolve without the LLM — the smoke test asserts provider call count 0). The LLM is consulted only when the table returns `ambiguous`: unknown alignment, an unmarked evil victor with no keyword signal, or an execute-leaning killer under Legendary permadeath. `locationTag` (imprison/ransom continuity persisted into `playerDefeatState` and the `player_defeated` event) is templated per disposition on the rules path. Non-speaking victors keep their pre-existing skip (`leave_unconscious`, no LLM).

## Commands

```
npm test -- src/db/npcCombatDispositionSmoke.test.ts src/agents/defeatRules.test.ts src/agents/defeatDisposition.test.ts
npm run dev
```
