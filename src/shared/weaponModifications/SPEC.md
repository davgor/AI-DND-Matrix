# Weapon enchantments and multi-type damage

Per-instance weapon modifications overlay the shared catalog without mutating global `items` rows. Equipped attacks resolve **multi-component damage** — each component rolled separately, resistance applied per type, then summed.

## DamageComponent

```typescript
{ damageRoll: DamageRoll, damageType: DamageType }
```

A catalog weapon contributes one base component from `WeaponProperties.damageRoll` + `damageType`. Enchantments append additional components via `addDamageComponent` modifications on the owning `character_items` row.

## Merge rule

Equipped attack profile = **catalog base components** + validated **`addDamageComponent`** modifications on that `character_item`. Instance-only overlays (`setDisplayName`, `setDescription`) affect sheet UI only — not dice.

**Global catalog immutability:** enchantment flows never call `upsertCatalogItemByName` or update `items.mechanical_properties`. Two characters owning the same catalog longsword may have different modifications.

## Crit rule

Natural 20 doubles **dice count on every component** (not modifier). Example: 1d8 physical + 1d6 fire on crit → 2d8 physical + 2d6 fire.

## Resistance rule

Each component is rolled, then passed through `applyResistance(amount, type, profile)` independently. Final damage is the sum of `afterResistance` values.

Example — longsword 1d8 physical + 1d6 fire enchant vs fire-resistant target:

| Component | Rolled | After resistance |
|-----------|--------|------------------|
| physical  | 5      | 5                |
| fire      | 4      | 2 (halved)       |
| **Total** |        | **7**            |

## Enchantment caps (engine authoritative)

| Rule | v1 limit |
|------|----------|
| Max total components (base + adds) | 2 |
| `addDamageComponent.diceCount` | 1–2 |
| `addDamageComponent.diceSize` | ≤ 8 |
| Allowed `damageType` | engine `DamageType` enum |

Agent proposals use `{ damageType, diceCount, diceSize }` — no free-form dice from the agent. Server validation rejects out-of-band values.

## Worked example: greatsword + fire

Base greataxe catalog: 1d12 physical. Player enchants their owned instance with `addDamageComponent` fire 1d6.

Attack resolution (non-crit, no resistance):

1. Roll physical: 1d12 → 9
2. Roll fire: 1d6 → 4
3. Total damage: 13

Sheet shows: `1d12 physical` + `+ 1d6 fire (enchanted)`.

## Agent proposal shape

Dedicated `resolveItemModification()` call (not per-turn narrate loot):

```json
{
  "narrationText": "flavor beat",
  "modification": {
    "targetCharacterItemId": "uuid",
    "kind": "addDamageComponent",
    "damageType": "fire",
    "diceCount": 1,
    "diceSize": 6
  }
}
```

Player must own the target item (equipped or in inventory). Engine clamps dice via `validateModification()` before persist.
