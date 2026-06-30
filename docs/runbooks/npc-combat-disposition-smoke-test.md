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

## Commands

```
npm test -- src/db/npcCombatDispositionSmoke.test.ts
npm run dev
```
