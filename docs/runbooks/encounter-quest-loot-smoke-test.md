# Encounter and quest loot smoke test

## Automated

```bash
npm test -- src/db/encounterQuestLootSmoke.test.ts src/main/lootPipeline.test.ts src/main/lootGrants.test.ts src/agents/loot.test.ts src/engine/lootPolicy.test.ts
```

## Scenarios

**A — Wolf pack (encounter end)**
- Defeat beast-bucket foes (catalog wolf)
- Loot pass grants only `misc` (fangs, hide)
- Inventory must contain **no** `weapon` or `magicItem` rows

**B — Humanoid bandit (encounter end)**
- Defeat humanoid foe
- Loot may include common/uncommon weapon, armor, misc, or potion within policy

**C — Quest completion (minor hook)**
- Story thread transitions to `completed` for a short errand hook
- Reward is misc or potion at `common` rarity — not epic-tier gear

**D — Validation guardrail**
- Beast policy rejects agent-proposed weapons; only valid misc grants persist

## Manual (dev)

1. Start a campaign and provoke a wolf or beast NPC (catalog creature with `beast` bucket).
2. Win the encounter — confirm a **Loot** banner or DM line appears in the exposition feed.
3. Open the character sheet — new misc items appear without restarting the app.
4. Repeat with a humanoid bandit — loot may include a worn weapon or coin misc.
5. Complete a minor story thread via narration (`storyThreadUpdate` → `completed`) — confirm a modest reward (coin misc or common potion).
6. In DevTools, verify `loot_resolved` events in the campaign event log with `policySummary` and `acceptedItemIds`.

## Notes

- Engine `resolveLootPolicy` is authoritative; agents cannot exceed `maxRarity` or forbidden types.
- Encounter loot runs when `combat_ended` with `outcome: defeated` and lootable foes remain.
- Quest loot runs only on transition into `completed` / `resolved` / `done`.
- If both fire same turn, encounter loot runs first; quest loot is skipped to prevent duplicate grants.
- Epic **036** will run XP and level-up before loot when implemented.
