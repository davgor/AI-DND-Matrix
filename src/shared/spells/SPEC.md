# Player spellbook

Read-only reference for spells the active player character has learned. Distinct from the journal (first-person notes), log book (world knowledge), quest log (objectives), and the full catalog (engine/DM content library).

## Types

**`KnownSpellView`** — resolved catalog row for display:

| Field | Source |
|-------|--------|
| `catalogKey` | `catalog_spells.key` |
| `name` | `catalog_spells.name` |
| `effectType` | `catalog_spells.effect_type` |
| `range` | `catalog_spells.range` |
| `cost` | `catalog_spells.cost` — **turns locked out** after casting, not mana or spell slots |
| `tags` | `catalog_spells.tags` |
| `constraintsHint` | synthesized from `constraints` (e.g. `Mage · level 3+`) |
| `rulesText` | short rules line from effect, range, and cost |

## Join rules

```
characters.stats.knownSpellKeys: string[]
        │
        ▼
resolveKnownSpells(keys, getSpellByKey)
        │
        ▼
KnownSpellView[]  (invalid keys omitted)
```

- Dedupe keys before resolution.
- Sort: **alphabetical by spell name** (stable for narration context and modal).
- Unknown catalog keys are dropped (dev log optional); stats are never mutated by the resolver.

## Grant paths (v1)

| Path | Mechanism |
|------|-----------|
| Level-up | `spell_access` perk → `perkCategoryAppliers` appends validated `catalogSpellKey` |
| DM narration | `spellGrants?: { catalogSpellKey: string }[]` on `NarrationResult` — validated append, same dedupe |

Spells are append-only in v1; narration does not remove keys.

## Worked example

1. Mage levels up and chooses a `spell_access` perk with `catalogSpellKey: "firebolt"`.
2. `stats.knownSpellKeys` becomes `["firebolt"]`.
3. Player opens **Journal → Open spellbook**.
4. IPC `spellbook:listForCharacter` resolves Firebolt:

   - Name: Firebolt
   - Effect: damage · ranged · 1 turn cost
   - Tags: fire, single-target
   - Constraints: Mage · level 1+

## vs other systems

| System | Purpose |
|--------|---------|
| Spellbook | Known castable abilities — *what can I use?* |
| Journal | Personal diary — *what happened to me?* |
| Log book | World knowledge — *what do I know?* |
| Quest log | Objectives — *what am I trying to do?* |
| Catalog | Full content library (engine/DM) — not shown wholesale to players |

## Modal entry (v1)

- **Journal tab** on the play sheet rail: **Open spellbook** alongside journal and quest log.
- Uses `ModalPortal` + `.modal-overlay` (viewport centered).
- Refreshes when play `refreshToken` changes (level-up grants appear without reopening campaign).

## DM narration context

When `knownSpellKeys` is non-empty, include up to `MAX_KNOWN_SPELLS_IN_CONTEXT` (8) spell **names** and turn costs in narration context, sorted alphabetically by name. The player may reference these in free-text actions; the engine still resolves outcomes.

## Non-goals

- Casting spells from the spellbook UI (player types actions in the composer)
- Spell slots, mana, or preparation/rest mechanics
- Grayed-out catalog browser for unknown spells
- Per-spell player notes or favorites
- NPC or party-member spellbooks in v1
- New spell tables beyond `knownSpellKeys` in stats JSON
