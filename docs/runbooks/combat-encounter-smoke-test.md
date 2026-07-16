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
6. NPC/party catch-up turns produce **zero** LLM calls by default — flavor comes
   from deterministic templates (epic 040.6, `src/main/combatFlavorTemplates.ts`).

## Combat flavor: templates by default, LLM opt-in (040.6)

During combat catch-up (the NPC/party turns resolved after each player action),
hit/miss/damage are always engine-resolved; the accompanying flavor line is a
deterministic template keyed by temperament, disposition, hit/miss, and
speaking vs non-speaking (`reactionKind: 'dialogue'` plain text for speaking
NPCs, `reactionKind: 'action'` with `**wrapped**` prose for non-speaking ones).
Party members get short template action lines. No provider calls are made.

For manual QA of the old per-combatant LLM flavor path, set the env flag in
`.env` (or the shell) before launching:

```
COMBAT_LLM_FLAVOR=true
```

With the flag set, NPC catch-up turns call `generateNpcReaction` and party
member turns call `decidePartyMemberAction` again (flavor only — combat
outcomes are still engine-resolved either way). Any value other than the exact
string `true` leaves templates on. Non-combat NPC reactions are unaffected by
this flag: they always use the LLM and keep persisting NPC memories.

## Manual (dev)

1. `npm run dev` and enter play with a campaign that has a hostile NPC in the region.
2. Type an action that starts combat — confirm the combat HUD shows initiative order and round.
3. Attack on your turn — confirm HP chips update for player and hostile NPCs.
4. Let the encounter resolve — confirm the HUD hides when combat ends.
5. Optional: restart the app mid-encounter and confirm initiative/HP survive in SQLite.
