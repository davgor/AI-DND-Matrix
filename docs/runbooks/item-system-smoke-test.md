# Item system smoke test

Validates epic 024: catalog grants, equip mechanics, AC/damage reads, consumables, purchases, and persistence across DB reopen.

## Prerequisites

- `npm install`
- Native module built: `npm run rebuild:node` (runs automatically via `pretest`)

## Automated smoke

```bash
node scripts/item-system-smoke.mjs
```

Equivalent:

```bash
npx vitest run src/db/itemSystemSmoke.test.ts
```

Flow:

1. Migrate a fresh SQLite file and seed starter catalog items
2. DM-style AI item grant creates a canonical catalog row and inventory entry
3. Equip weapon + armor; verify damage roll and AC tier change
4. Consume a healing potion (HP increases, stack removed)
5. Purchase blocks on insufficient funds, then succeeds and debits currency
6. Reopen the same DB file; equipped weapon and armor tier persist

## Manual smoke (full app)

1. Run `npm run dev` with a configured provider.
2. Start or load a campaign and open the character sheet.
3. Play until the DM narrates a loot/reward moment (or use dev tooling to grant an item).
4. Equip the new item; confirm AC or weapon damage reflects the change on the sheet / in combat.
5. Use a healing potion; confirm HP rises and the potion disappears.
6. Buy an item from a shopkeeper when you have enough currency; confirm balance drops.
7. Restart the app; inventory and equipped slots should match.

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| 2026-06-28 | vitest | pass | `node scripts/item-system-smoke.mjs` |
