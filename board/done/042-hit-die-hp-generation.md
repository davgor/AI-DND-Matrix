# EPIC: Hit-die HP generation for players, party members, NPCs, and catalog monsters

Combat HUD and rest flows are showing broken HP (e.g. `0/0`, `1/1`) because **max HP is not persisted consistently** and several creation paths never assign HP at all. Today `computeHP` uses a **fixed hit-die average × level** formula; the ruleset should instead use **rolled hit dice + Body (CON) modifier** at level 1 and **+1 hit die per level** thereafter.

NPC **villagers** should default to **10 HP** (not 6). **Retired adventurers** should use the same hit-die pipeline as players and AI party members (archetype + level + Body), not the current fixed stat blocks (22/18/28 HP). **Catalog monsters** should also derive max HP from hit dice (level + archetype + Body) at spawn/hydration time — not copy a static catalog `hp` field and never fall back to **1 HP** when `maxHp` is missing.

Builds on **004** (engine), **009** (character creation), **023** (content catalog), **032** (NPC combat tiers), **036** (level-up / XP).

Broken down into sub-tickets **042.1–042.11**. This epic is done when all are complete, `npm test`, `npm run lint`, and `npm run typecheck` pass.

## Problem statement (current behavior)

| Entity | Today | Symptom |
|--------|-------|---------|
| Player character | `computeHP(archetype, 1, body)` at create; no `stats.maxHp` | HUD `maxHp` falls back to current `hp` when `stats.maxHp` missing |
| AI party member (`createPartyMembers`) | **No `hp`, `level`, or ability scores** — defaults to `hp: 0` | `0/0 HP` in combat (see screenshot) |
| Promoted NPC → party | Uses `computeHP` average formula | Works partially but wrong formula vs spec |
| NPC villager | `VILLAGER_STATS` = 6 HP | Too low; should be 10 |
| Retired adventurer | Fixed profiles in `npcCombatStats.ts` | Not hit-die-based; diverges from PC/party model |
| Catalog monster (`hydrateNpcFromCatalog`) | Copies static `creature.hp` from catalog row | Ignores level range + Body; generated/link paths can leave `maxHp` null |
| NPC combat fallbacks | `npc.maxHp ?? 1` in `combatResolvers` / `yieldReview` | Monsters/ NPCs display as **1 max HP** when hydration skipped or incomplete |
| Level-up | `PERK_HP_BONUS` perk only (+2 optional) | No automatic hit-die gain per level |

## Target rules

### Player characters & AI party members

- **Level 1 max HP** = `roll(hitDie) + Body modifier` (one roll, engine-owned RNG; persist the roll).
- **Each additional level** = add `roll(hitDie)` to max HP (Body modifier applies only at level 1, per standard d20 convention used in README — document explicitly in 042.1).
- **Current HP** at creation = max HP (full health).
- Persist on the character row:
  - `hp` (current)
  - `stats.maxHp` (authoritative ceiling for HUD, rest, dying saves)
  - `stats.abilityScores` (required for party members too)
  - optional `stats.hitDieRolls: number[]` audit trail (one entry per level gained) for debugging and migration transparency

### NPC villagers

- Default **`maxHp = hp = 10`**, AC/attack unchanged from epic 032 unless spec says otherwise.

### Catalog monsters (catalog-tier NPCs)

- On catalog hydration (`hydrateNpcFromCatalog` and encounter spawn paths), compute max HP with the **same hit-die engine** as PCs:
  - **Level** = seeded pick in `[creature.levelMin, creature.levelMax]` (stable per `npcId` + `catalog_creature_key`; document tie-break rules in 042.1)
  - **Archetype** = `creature.archetypeHint` or engine default (e.g. `fighter` for beasts without hint)
  - **Body** = `creature.abilities.body`
  - Roll hit dice per 042.2; persist `hp`, `max_hp`, and optional `hit_die_rolls` on the NPC row
- Catalog `hp` column becomes a **reference budget** for seed authoring and retrieval scoring (042.11), not the value copied onto NPC rows at runtime.
- **Minimum max HP floor** for catalog monsters: at least **4** after rolls (document in spec) so low rolls never produce trivial 1 HP foes unless a future “minion” tag explicitly allows it.
- Remove `maxHp ?? 1` silent fallbacks — unresolved max HP is a hydration bug, not a display default.

### Retired adventurers

- Replace fixed HP constants with engine-derived stats:
  - Map `RetiredAdventurerProfile` → `{ archetype, level, bodyScore }` (deterministic table in engine, not agent-generated).
  - Compute max HP via the **same hit-die functions** as PCs (seeded RNG per NPC id at hydration time so values are stable across reloads).
- AC/attack/damage may remain profile-based for 042 scope **or** be revisited in 042.1 — default: **HP only** in this epic; leave AC/attack as today's profile constants unless trivial to align.

## Definition of done

- No playable combatant shows `0/0` max HP after creation or promotion.
- Combat HUD, rest, and dying-save logic read a single authoritative `maxHp`.
- Villager NPCs spawn with 10 HP.
- Retired adventurers use hit-die max HP within documented level/body caps (still below a fresh mid-level PC).
- Catalog-linked monsters spawn with hit-die max HP within their level range — no default 1 HP monsters.
- Level-up awards hit-die HP automatically before optional perk bonuses.
- Existing saves backfilled on open (migration) without corrupting in-progress combat.

042.1 HP spec + shared types · 042.2 engine hit-die HP core · 042.3 character creation + party member hydration · 042.4 persist maxHp + combat/rest consumers · 042.5 NPC villager 10 HP base · 042.6 retired adventurer hit-die HP · 042.7 level-up hit-die gain · 042.8 save migration + backfill · 042.9 promotion path alignment · 042.10 smoke tests + README rules update · 042.11 catalog monster hit-die HP at spawn

## Sub-tickets

### 042.1 HP spec + shared types

#### Description

Document the authoritative HP model in `src/engine/hp/SPEC.md` (or extend `src/shared/combat/SPEC.md`) and add shared types:

- `HitDieRollLog` / `MaxHpBreakdown` if useful for UI or tests
- `RetiredAdventurerStatProfile` engine mapping: `profile → { archetype, level, bodyScore }`
- `CatalogMonsterHpInput`: `{ archetype, level, bodyScore, npcId, catalogKey }` + level-pick policy
- Clarify Body modifier application: **+Body mod once at level 1 only** (confirm against README; update README in 042.10 if changed)
- Document seeded RNG policy for NPCs/monsters (hash `npcId` + campaign id → stable roll sequence)
- Update `src/shared/npcCombat/SPEC.md` tier precedence: catalog tier uses hit-die HP at hydration, not static catalog `hp` copy

#### Acceptance Criteria

- [ ] Spec describes L1 roll, per-level die adds, and maxHp persistence contract
- [ ] Spec documents villager 10 HP, catalog monster level pick + hit-die HP, and retired-adventurer precedence
- [ ] Spec documents catalog `hp` as authoring reference vs runtime computed max
- [ ] Shared types exported and covered by parse/guard unit tests
- [ ] Spec explicitly calls out the `createPartyMembers` gap and `maxHp ?? 1` fallback as bugs this epic fixes

---

### 042.2 Engine hit-die HP core

#### Description

Refactor `src/engine/hp.ts`:

- Replace average-only `computeHP` with:
  - `rollHitDie(size, rng)` 
  - `computeMaxHpFromHitDice({ archetype, level, bodyScore, hitDieRolls })` — sum of rolls + Body mod (if level ≥ 1)
  - `rollInitialMaxHp(archetype, bodyScore, rng)` — L1 creation helper
  - `rollLevelUpHpGain(archetype, rng)` — single die for +1 level
- Accept injectable `RandomFn` (reuse pattern from `src/engine/checks.ts`) for tests.
- Deprecate or reimplement old `computeHP` as thin wrapper over stored rolls for backward compatibility during migration only.

#### Acceptance Criteria

- [ ] Unit tests: L1 HP ∈ `[1 + mod, dieSize + mod]`; multi-level sum matches manual die list
- [ ] Same seed → same HP (deterministic RNG)
- [ ] Fighter d10 vs mage d6 produce expected distributions in bounded property tests
- [ ] No Electron/DB imports in engine module

---

### 042.3 Character creation + party member hydration

#### Description

Fix all character row creation paths:

**Player** (`createPlayerCharacter`): roll L1 HP, set `hp` and `stats.maxHp`, store `hitDieRolls: [roll]`.

**AI party members** (`createPartyMembers`): today writes only `personality` — add engine-owned defaults:
- Roll or assign ability scores (document choice: e.g. standard array shuffle or 4d6-drop-lowest per member with campaign-seeded RNG)
- Infer `Archetype` from `characterClass` string (reuse promotion keyword map)
- Roll L1 HP via 042.2; persist `maxHp`, `level: 1`, full `abilityScores`, `ac`

**Promotion** (`confirmNpcPromotion`): switch to new HP helpers; persist `maxHp` + rolls.

#### Acceptance Criteria

- [ ] New player enters play with `hp === stats.maxHp > 0`
- [ ] New AI party members enter play with `hp === stats.maxHp > 0` and valid ability scores
- [ ] `createPartyMembers` unit/integration test reproduces the old `0/0` bug pre-fix and passes post-fix
- [ ] Promoted NPC party members match the same HP rules as setup-created party members

---

### 042.4 Persist maxHp + combat/rest consumers

#### Description

Make `stats.maxHp` authoritative everywhere:

- `combatSnapshot.resolveCharacterHp` — prefer `stats.maxHp`; if missing, compute from stored `hitDieRolls` + level + archetype + body, or run migration backfill (042.8)
- `combatSnapshot.resolveNpcHp` / `combatResolvers` — use persisted `npc.maxHp`; **remove `?? 1` fallbacks**; hydrate or migrate instead
- `turnIpc` rest helpers — use `stats.maxHp`, not recomputed average `computeHP`
- Ensure level-up and damage never write `maxHp` lower than current `hp` without explicit rules

#### Acceptance Criteria

- [ ] Combat HUD shows `currentHp/stats.maxHp` for players and AI party members in combat tests
- [ ] Combat HUD shows `currentHp/npc.maxHp` for catalog monsters with `maxHp > 1` in combat tests
- [ ] Rest to full sets `hp = stats.maxHp`
- [ ] No consumer uses `maxHp ?? 1` or deprecated average-only `computeHP` for display max
- [ ] Unit tests for snapshot with and without persisted `maxHp` (characters and catalog NPCs)

---

### 042.5 NPC villager 10 HP base

#### Description

Update `VILLAGER_STATS` in `src/engine/npcCombatStats.ts` to **10 HP** (`hp` and `maxHp`). Update `hydrateNpcVillagerTier` and any tests/fixtures expecting 6.

#### Acceptance Criteria

- [ ] `getNpcCombatStats('villager')` returns `hp: 10, maxHp: 10`
- [ ] New speaking/mundane NPCs hydrate to 10 HP
- [ ] Epic 032 smoke expectations updated where they assert villager HP

---

### 042.6 Retired adventurer hit-die HP

#### Description

Replace fixed retired-adventurer HP values with hit-die computation:

- Add `RETIRED_ADVENTURER_PROFILE_STATS` mapping to `{ archetype, level, bodyScore }`
- On `applyRetiredAdventurerUpgrade` / hydration: compute HP using seeded RNG from `npcId` (stable across sessions)
- Keep AC/attack/damage from existing profile constants unless 042.1 expands scope
- Document max HP bounds per profile (should remain below fresh level-5 PC per 032 intent)

#### Acceptance Criteria

- [ ] Each profile produces deterministic max HP for a given NPC id
- [ ] Retired adventurer max HP > villager (10) and < documented cap
- [ ] Re-loading save does not reroll NPC max HP
- [ ] Unit tests per profile + regression for `reviewRetiredAdventurer` upgrade path

---

### 042.7 Level-up hit-die gain

#### Description

When XP awards increase `level` (`xpAwardPersistence` / `progressionPipeline`):

- For each level gained, roll one hit die (injectable RNG), append to `stats.hitDieRolls`, increase `stats.maxHp` by roll amount
- Increase current `hp` by the same amount (gain HP on level-up) unless a different rule is documented
- Keep optional `hp_max_bonus` perk as **additional** +2 on top of hit-die gains

#### Acceptance Criteria

- [ ] Level 1→2 awards exactly one hit-die roll to max HP in tests
- [ ] Multi-level jump (e.g. +4 levels) awards four rolls
- [ ] Perk `hp_max_bonus` still works and stacks correctly
- [ ] Progression smoke tests updated

---

### 042.8 Save migration + backfill

#### Description

Forward migration on DB open:

- Characters with `hp === 0` or missing `stats.maxHp`: backfill using archetype, level, body (or defaults for party members missing scores), seeded by `character.id`
- NPC villagers at 6 HP → 10 HP (preserve current HP ratio or heal to full — document choice in 042.1; default: set both to 10 if untouched mid-combat flag absent)
- Catalog-linked NPCs with missing/`maxHp <= 1` or static old catalog copy: recompute via 042.11 unless in active combat
- Retired adventurers on old fixed HP: recompute via 042.6 unless in active combat encounter

#### Acceptance Criteria

- [ ] Opening an old save backfills playable characters to `maxHp > 0`
- [ ] Migration is idempotent
- [ ] Migration covered by test loading a fixture DB from pre-042 schema values
- [ ] No migration runs unbounded agent calls

---

### 042.9 Promotion path alignment

#### Description

Ensure NPC promotion and party recruitment preserve HP integrity:

- Promotion uses same `hitDieRolls` / `maxHp` persistence as 042.3
- Recruiting roster party member to a protagonist (`recruitPartyMemberFromRoster`) does not reset HP
- Combat tier on source NPC does not leak incorrect max into character row

#### Acceptance Criteria

- [ ] `promotionIpc.test.ts` asserts rolled maxHp and full current hp
- [ ] Promoted character HUD matches engine max after first combat snapshot
- [ ] Roster transfer does not zero HP

---

### 042.10 Smoke tests + README rules update

#### Description

- Add/extend smoke: create campaign → player + party → enter combat → HUD shows sane `x/y HP` for all friendly combatants
- Encounter with at least one **catalog monster** (e.g. goblin-scout) shows hit-die max HP in HUD, not `x/1`
- Villager NPC attackable at 10 HP; retired adventurer upgrade path shows higher max
- Update README **Rules Engine** HP bullet to describe rolled hit dice (not "fixed average")
- Optional: note in combat runbook

#### Acceptance Criteria

- [ ] Automated smoke covers player + at least one AI party member in combat HUD
- [ ] Automated smoke covers at least one catalog monster with computed max HP > 1
- [ ] README HP description matches implemented rules (PCs, NPCs, and catalog monsters)
- [ ] `npm test`, `npm run lint`, `npm run typecheck` pass with epic complete

---

### 042.11 Catalog monster hit-die HP at spawn

#### Description

Replace static catalog HP copy with hit-die computation when linking a creature to an NPC:

- Refactor `hydrateNpcFromCatalog` to:
  - Pick encounter level in `[levelMin, levelMax]` via seeded RNG (`npcId` + `catalog_creature_key`)
  - Resolve archetype from `archetypeHint` with documented defaults per bucket (e.g. beasts → `fighter` d10 unless tagged caster)
  - Call 042.2 helpers with `creature.abilities.body`
  - Set `hp = maxHp = computedMax`, `combat_tier = 'catalog'`, persist rolls if storing audit trail on NPC row
- Ensure **every** catalog spawn path calls hydration (campaign generation catalog link, encounter start, catalog promotion) before combat
- Reconcile catalog seed `hp` values in `CREATURE_SEEDS_V1`: recompute or annotate as expected reference totals for validation tests (creature `hp` should approximate hit-die expectation at midpoint level, not be copied at runtime)
- Generated/promoted catalog creatures must have `archetypeHint`, `levelMin`/`levelMax`, and full `abilities` before they can hydrate

#### Acceptance Criteria

- [ ] `hydrateNpcFromCatalog` never assigns `maxHp` from `creature.hp` directly
- [ ] Goblin at level 1 and stone golem at level 6 produce different hit-die max HP bands in unit tests
- [ ] Same NPC id + catalog key → same max HP across reloads
- [ ] No catalog monster enters combat with `maxHp` of 0 or 1 unless explicitly documented minion tag (default: floor of 4)
- [ ] Catalog import/seed tests updated; retrieval `decisionPolicy` may show reference HP or computed band per 042.1 spec
- [ ] `npcCombatHydration.test.ts` and combat encounter smoke cover catalog tier HP
