# Hit Points (HP) — authoritative rules

This document is the source of truth for max HP computation and persistence across player characters, AI party members, NPC tiers, and catalog monsters.

## Player characters and AI party members

- **Level 1 max HP** = `roll(hitDie) + Body modifier` (one die roll; Body modifier applies **once**, at level 1 only).
- **Each additional level** = add `roll(hitDie)` to max HP (no further Body modifier).
- **Current HP** at creation = max HP (full health).
- Persist on the character row:
  - `hp` (current)
  - `stats.maxHp` (authoritative ceiling for HUD, rest, dying saves)
  - `stats.abilityScores` (required for party members too)
  - `stats.hitDieRolls: number[]` (one entry per level; audit trail)

### Known bugs fixed by epic 042

- `createPartyMembers` previously wrote only `personality`, leaving `hp: 0` and no `stats.maxHp` → combat HUD showed `0/0`.
- `combatSnapshot.resolveCharacterHp` fell back to `character.hp` when `stats.maxHp` was missing → `1/1` displays.
- `npc.maxHp ?? 1` in combat resolvers masked missing hydration.

## NPC villagers

- Default **`maxHp = hp = 10`**. AC and attack unchanged from epic 032.

## Catalog monsters

- On catalog hydration, max HP uses the **same hit-die engine** as PCs:
  - **Level** = seeded pick in `[creature.levelMin, creature.levelMax]` using seed `npcId:catalog_creature_key` (stable per NPC instance).
  - **Archetype** = `creature.archetypeHint` or `fighter` when absent.
  - **Body** = `creature.abilities.body`.
  - Roll hit dice per level; persist `hp`, `max_hp` on the NPC row.
- Catalog `hp` column is an **authoring reference** for seed validation and retrieval scoring — **not** copied at runtime.
- **Minimum max HP floor**: 4 after rolls (unless a future minion tag says otherwise).

## Retired adventurers

- Profile → `{ archetype, level, bodyScore }` table in engine (`RETIRED_ADVENTURER_PROFILE_STATS`).
- Max HP via hit-die rolls seeded by `npcId:retired:profile` (stable across reloads).
- AC/attack/damage remain profile constants from epic 032 for this epic's scope.

## Seeded RNG policy

NPC and monster HP use `createSeededRandom(hashStringSeed(seed))` so the same entity id always produces the same roll sequence. Character migration backfill seeds from `character.id:hp-migrate`.

## Level-up

- Each level gained: roll one hit die, append to `stats.hitDieRolls`, increase `stats.maxHp` by the roll amount, increase current `hp` by the same amount.
- Optional `hp_max_bonus` perk adds +2 **on top of** hit-die gains.

## Migration (v23)

- Characters with `hp === 0` or missing `stats.maxHp`: backfill via seeded rolls from `character.id`.
- Villagers at 6 max HP → 10 (full heal when at full health).
- Catalog/retired NPCs with `maxHp <= 1` or stale static values: recompute unless the NPC is in an **active** combat encounter.
- Idempotent: already-correct rows are untouched.
