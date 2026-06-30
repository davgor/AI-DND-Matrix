# Combat encounter smoke test

## Automated

```bash
npm test -- src/db/combatEncounterSmoke.test.ts src/db/repositories/combatEncounters.test.ts src/engine/playerAttack.test.ts src/shared/combat/types.test.ts
```

Run in isolation:

```bash
npx vitest run src/db/combatEncounterSmoke.test.ts
```

## What it covers

1. Seed a campaign with a hostile NPC (hydrated HP/AC).
2. Player action triggers `startEncounter` — initiative order persisted.
3. Player attacks on their turn — at least one hit and one miss across scripted RNG.
4. NPC combat events append to the campaign event log.
5. Encounter ends when the hostile is defeated; active encounter row clears.

## Manual (dev)

1. `npm run dev` and enter play with a campaign that has a hostile NPC in the region.
2. Type an action that starts combat — confirm the combat HUD shows initiative order and round.
3. Attack on your turn — confirm HP chips update for player and hostile NPCs.
4. Let the encounter resolve — confirm the HUD hides when combat ends.
5. Optional: restart the app mid-encounter and confirm initiative/HP survive in SQLite.
