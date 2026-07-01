# Quest log smoke test

Manual verification for epic **045** after automated `src/db/questLogSmoke.test.ts` passes.

## Prerequisites

- Dev build: `npm run dev`
- Campaign with at least one completed guided-creation character
- Claude or Player2 provider configured

## Steps

1. **Hub hook** — Open Campaign Hub. Confirm **Main story** section shows the premise hook line and main quest title.
2. **Region badge** — In **Regions**, confirm a region with an unaccepted `quest_hook` shows **Quest available**.
3. **Play chrome** — Resume a character. In play session chrome, click **Quests** (or the main-quest chip). Quest Log modal opens.
4. **Sheet overlay** — Open character sheet overlay → **Quest Log**. Same modal with main story pinned and side quests grouped.
5. **Accept side quest** — In **Available**, click **Track quest** on a seeded hook. Status becomes **Active**.
6. **Complete quest** — Play until the DM resolves the objective (or use **Curate → Force complete** in dev). Confirm XP/loot narration appears on the turn feed.
7. **Completed section** — Reopen Quest Log. Side quest appears under **Completed** with in-game completion day.
8. **Multi-character** — Switch to another player character. Their **Active** side quests should not mirror the first character's accepted quests.

## Expected

- Main quest is `active` from campaign start (per character).
- Side quests stay `available` until accepted.
- Rewards fire once per quest completion (no double XP from story thread + quest log on the same turn).

## Automated

```bash
npx vitest run src/db/questLogSmoke.test.ts
```
