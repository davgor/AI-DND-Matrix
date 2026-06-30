# Weapon enchantment smoke test

Validates epic 037: per-instance weapon modifications, multi-component damage, enchant intent routing, and persistence across DB reopen.

## Prerequisites

- `npm install`
- Native module built: `npm run rebuild:node` (runs automatically via `pretest`)

## Automated smoke

```bash
npx vitest run src/db/weaponEnchantmentSmoke.test.ts
```

Flow:

1. Migrate a fresh SQLite file; seed longsword and equip on player
2. Player submits enchant-fire intent → `modifyItem` turn persists 1d6 fire on the `character_items` row
3. Equipped weapon profile shows 1d8 physical + 1d6 fire; catalog longsword row unchanged
4. Player attack resolves `DamageBreakdown` with two components
5. Reopen the same DB file; modification still present

Related unit coverage:

```bash
npx vitest run src/shared/weaponModifications/types.test.ts src/engine/weaponDamage.test.ts src/engine/modificationValidation.test.ts src/db/repositories/characterItemModifications.test.ts src/main/modificationPipeline.test.ts src/agents/itemModification.test.ts src/main/turnIpcModification.test.ts
```

## Manual smoke (full app)

1. Run `npm run dev` with a configured provider.
2. Load a campaign with a weapon equipped (longsword from starter catalog is fine).
3. Type an enchant action, e.g. *"I enchant my longsword to deal fire damage."*
4. Confirm narration plays and the character sheet weapon slot lists physical + fire lines.
5. Attack an NPC; combat exposition should reflect multi-type damage totals.
6. Restart the app; the enchantment should still appear on the sheet.

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| 2026-06-29 | vitest | pass | `npx vitest run src/db/weaponEnchantmentSmoke.test.ts` |
