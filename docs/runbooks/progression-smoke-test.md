# Progression smoke test (XP → level-up → perks)

Validates encounter/quest XP awards, level-up ceremonies, and perk persistence using scripted providers (no live LLM).

## Automated

```bash
npm test -- src/db/progressionSmoke.test.ts src/main/progressionPipeline.test.ts
```

Covers:

- Encounter defeat awards XP in engine band and updates character row
- Level-up queues exactly 3 perk options; `submitPerkChoice` persists one perk
- Arcane activity span includes `spell_access` among options; chosen spell lands in `stats.knownSpellKeys`
- Engine clamps over-budget XP proposals
- Loot events append after `xp_awarded` on the same encounter beat

## Manual dev check

1. `npm run dev` and open a campaign with a level 1 fighter.
2. Win a combat encounter — exposition should show an **Experience** banner before **Loot**.
3. If XP crosses a threshold, the level-up modal blocks play until you pick 1 of 3 perks.
4. Open the character sheet **Perks** section — chosen perk shows with mechanical summary.
5. Seed library/arcane journal beats before leveling to see spell-leaning options.

## Fixture notes

- `src/db/progressionSmokeFixtures.ts` — combat bandit + arcane library scenarios
- Scripted responses: `COMBAT_XP_RESPONSE`, `QUEST_XP_RESPONSE`, `ARCANE_LEVEL_UP_RESPONSE`
