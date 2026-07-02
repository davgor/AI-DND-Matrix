# Equipment slot model (v2)

Epic 044 expands the legacy three-slot model (`weapon` | `armor` | `trinket`) into body slots plus accessory slots. The engine owns all equip validation and conflict resolution; UI and IPC call `validateEquip` / `slotsAffectedOnEquip` before persisting.

## Slot enum

| Slot | Role |
|------|------|
| `armor` | Chest/body armor (light / medium / heavy tier) |
| `mainHand` | Primary weapon or empty |
| `offHand` | 1H weapon, shield, or empty |
| `head` | Helm, circlet, hat |
| `hands` | Gloves, gauntlets |
| `feet` | Boots, greaves |
| `belt` | Belt, sash |
| `neck` | Amulet, pendant |
| `ring1` | First ring |
| `ring2` | Second ring |

Accessory slots replace the single `trinket` slot. Rings use two fixed slots (`ring1`, `ring2`) rather than a shared `ring` slot.

## Item properties

### Weapons (`WeaponProperties`)

- `handedness`: `oneHand` | `twoHand` (required for all weapons)
- `oneHand` weapons may equip to `mainHand` or `offHand`
- `twoHand` weapons equip only to `mainHand` and logically occupy both hands

### Shields (`ShieldProperties`)

- `kind: 'shield'`, `acBonus: number`
- `equipSlot: 'offHand'`
- Separate from body armor tier; does not replace the `armor` slot

### Body armor (`ArmorProperties`)

- `kind: 'armor'`, `armorTier`: `none` | `light` | `medium` | `heavy`
- `equipSlot: 'armor'`

### Accessories (`MagicItemProperties`)

- `acBonus`, `attackBonus` (additive)
- `equipSlot`: one accessory slot (`head`, `hands`, `feet`, `belt`, `neck`, `ring1`, `ring2`)
- Optional `accessorySlot` hint mirrors `equipSlot` for AI-proposed items

## Conflict matrix (pure functions — unit-tested in `equipment.ts`)

| Equip action | Current state | Result |
|--------------|---------------|--------|
| 2H weapon → `mainHand` | `offHand` occupied | Clear `offHand`, equip 2H |
| 2H weapon → `mainHand` | `offHand` shield | Clear shield, equip 2H |
| Shield → `offHand` | `mainHand` 2H | Clear `mainHand` 2H, equip shield |
| 1H weapon → `offHand` | `mainHand` 2H | **Reject** (`off_hand_blocked_by_two_hand`) |
| 1H + 1H dual wield | `mainHand` 1H, equip 1H `offHand` | **Allow** (no attack penalty in v1) |
| Sword + shield | `mainHand` 1H sword, equip shield `offHand` | **Allow** |
| Accessory | Slot occupied | Swap (clear slot, equip new) |

**v1 decision — dual wield:** no off-hand attack penalty; main-hand weapon profile drives player attacks.

**v1 decision — rings:** `ring1` and `ring2` are distinct fixed slots.

## AC aggregation

```
totalAC = 10 + agilityMod + armorTierBonus + shieldBonus + accessoryAcBonusSum
```

| Source | Cap / notes |
|--------|-------------|
| Base | 10 |
| Agility | `abilityModifier(agility)` |
| Armor tier | `ARMOR_BONUS[tier]` (0–6) |
| Shield | `ShieldProperties.acBonus` from `offHand` only |
| Accessories | Sum of `MagicItemProperties.acBonus` across all equipped accessory slots |

Accessory AC is additive with armor tier (not double-counted). No global AC cap in v1.

## Attack aggregation

```
attackMod = agilityMod + proficiency + accessoryAttackBonusSum + (weapon profile from mainHand)
```

Off-hand 1H weapons do not add a second attack roll in v1. Accessory `attackBonus` sums across equipped accessory slots.

## Migration mapping (legacy → v2)

| Legacy `equip_slot` | New slot | Notes |
|---------------------|----------|-------|
| `weapon` | `mainHand` | Add `handedness` from item name heuristics |
| `armor` | `armor` | Unchanged |
| `trinket` | Heuristic accessory | `ring*` → `ring1`; `boot`/`greaves` → `feet`; `belt` → `belt`; `helm`/`head` → `head`; `glove`/`gauntlet` → `hands`; `neck`/`amulet` → `neck`; default → `ring1` |

Equipped `character_items.equipped_slot` rows migrate with the same mapping.

## Worked examples

### Greatsword + empty off-hand

- Equip `Greatsword` (`twoHand`) to `mainHand`
- `offHand` must be empty (or cleared on equip)
- AC: base + agility + armor only; attack uses greatsword profile

### Sword + shield

- `Shortsword` (`oneHand`) in `mainHand`
- `Wooden Shield` in `offHand`
- AC includes shield `acBonus` plus body armor tier

### Handaxe + sword (dual wield)

- `Handaxe` in `mainHand`, `Shortsword` in `offHand`
- No attack penalty; combat uses `mainHand` weapon profile only

### Boots + belt + ring

- `Boots of Speed` → `feet`, `Leather Belt` → `belt`, `Ring of Warding` → `ring1`
- AC += ring `acBonus`; all three slots independent

## Non-goals

- Multi-denomination currency (single `characters.currency` integer)
- Non-weapon enchantment modifications (epic 037 is weapon-only)
- Per-stack enchanted instance splitting
- Player-authored log book entries (DM-curated knowledge only)

## DM curation

Log book edit/delete in play uses a **Curate** toggle in the log book modal (not a dev-only panel). When enabled, DM tools expose per-entry edit/delete via `logBook:*` IPC.
