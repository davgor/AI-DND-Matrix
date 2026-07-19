# Starting loadout specification (v1)

Engine-owned archetype packages for the onboarding equipment-selection step (epic **047**). Item names reference the starter `items` catalog; spell keys reference `catalog_spells`.

## Pick rules

| Slot | Rule |
|------|------|
| **Weapon** | Pick exactly one from the archetype weapon list |
| **Armor** | Pick exactly one from the archetype armor list |
| **Off-hand** | Pick one option when the package lists off-hand choices; hidden when the list is empty |
| **Spells** | Pick exactly `spellPickCount` keys from the offered spell list (0 for pure martial with no abilities) |

## Off-hand / two-handed interaction

- A **two-handed** weapon in `mainHand` blocks any off-hand item except the explicit **empty** choice.
- **Shield** in off-hand blocks equipping a two-handed weapon in `mainHand` (existing equip conflict engine).
- **Empty** off-hand grants no off-hand item.

## Per-archetype packages

| Archetype | Weapons | Armor | Off-hand | Spells (pick N) |
|-----------|---------|-------|----------|-----------------|
| fighter | Longsword, Handaxe, Greataxe, Greatsword | Chain Hauberk, Traveler's Leathers, Unarmored Garb | Wooden Shield, Handaxe, empty | 1: rallying-strike, pressing-assault, iron-stance, hamstring, war-cry |
| rogue | Dagger, Shortsword, Handaxe | Traveler's Leathers, Unarmored Garb | Dagger, empty | 1: sneak-strike, venom-stab, blur-step, dirt-in-eyes, cheap-shot |
| mage | Dagger, Handaxe | Traveler's Leathers, Unarmored Garb | — | 2: firebolt, arcane-bolt, magic-missile, shocking-grasp, mage-armor, ray-of-frost |
| cleric | Handaxe, Mace | Chain Hauberk, Traveler's Leathers | Wooden Shield, empty | 2: minor-heal, sacred-flame, bless, bane, shield-of-faith, guiding-bolt |
| ranger | Hunting Bow, Shortsword, Handaxe | Traveler's Leathers, Unarmored Garb | — | 2: beast-bond-strike, hunters-mark, ensnaring-shot, thorn-volley, pass-without-trace, volley |

Starting equipment is free (no currency change). Selections are validated in `/engine` before any DB write.
