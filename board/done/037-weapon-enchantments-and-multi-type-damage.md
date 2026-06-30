# EPIC: Weapon enchantments and multi-type damage

Today each weapon has **one** `damageRoll` and **one** `damageType` on the shared catalog row (`WeaponProperties`). Player attacks use `getEquippedWeaponDamageRoll` → `resolvePlayerAttackDamage`, which returns a **single total** — `damageType` is stored but not applied, and there is no way to persist “I enchanted *my* greatsword with fire.” Editing the global `items` row would affect every owner of that catalog id.

This epic adds **per-instance weapon modifications** and **multi-component damage** so play like *“I enchanted my greatsword to do fire damage”* becomes mechanical truth: the equipped weapon might deal **1d10 physical + 1d6 fire**, each component rolled separately, resistance applied per type, crit rules documented — and the enchantment **sticks on your `character_items` row**, not the shared catalog.

Agents propose modification **intent and flavor** (add fire damage, rename, update description); the engine owns dice sizes, types, caps, and persistence. Same guardrail pattern as 024.3 / 036 perks.

Builds on **024** (items/equip), **031** (player attack resolution vs NPCs). Until 031 lands, wire the new resolver into `resolvePlayerEquippedAttackDamage` and tests so attacks automatically pick it up.

Broken down into sub-tickets 037.1–037.10. This epic is done when all of them are.

Definition of done:
- shared types document damage components, modification kinds, and per-instance overlay rules
- `character_items` (or equivalent) stores modifications without mutating global `items`
- engine resolves multi-component weapon damage with per-type `applyResistance`
- DM recognizes enchant/modify-weapon intent and returns validated modification proposals
- equipped weapon attack path uses merged base + modification components
- character sheet shows component breakdown on equipped weapon
- smoke test: enchant longsword with 1d6 fire → attack resolves physical + fire separately and persists after restart

037.1 spec + shared types · 037.2 DB schema + repositories (per-instance modifications) · 037.3 engine multi-component damage + resistance · 037.4 engine modification templates + validation caps · 037.5 DM item-modification intent + schema · 037.6 modification persist pipeline · 037.7 equipped weapon component merge + attack wiring · 037.8 character sheet weapon detail UI · 037.9 modification events + narration grounding · 037.10 end-to-end enchantment smoke test

## Sub-tickets

### 037.1 Spec + shared types (damage components, modifications)

#### Description
Document multi-type weapon damage and per-instance modifications. Add shared types under `/shared`.

Cover:
- **`DamageComponent`**: `{ damageRoll: DamageRoll, damageType: DamageType }` — weapons become `damageComponents[]` (base catalog + overlays)
- **`ItemModification`**: `addDamageComponent` | `setDescription` | `setDisplayName` (flavor overlay on instance, not catalog) | future-safe enum
- **merge rule**: equipped attack uses `catalog base components` + `character_item modifications`; base catalog row never mutated for enchantments
- **crit rule**: natural 20 doubles dice count on **all** components (document and test)
- **resistance**: each component resolved through `applyResistance` then summed
- **enchantment caps**: max extra components per weapon, max dice size/count per modification (engine table in 037.4)
- **agent proposal shape**: `addDamageComponent: { damageType, diceCount, diceSize }` — no free-form modifier from agent
- example: longsword base 1d8 physical + enchant 1d6 fire → attack output shows both

#### Acceptance Criteria
- [x] Spec documents merge, crit, and resistance behavior with a worked greatsword + fire example
- [x] Shared types export `DamageComponent`, `ItemModification`, `WeaponDamageProfile`
- [x] Spec states global `items` rows are immutable under enchantment flows
- [x] Unit tests validate modification JSON guards

### 037.2 DB schema + repositories (per-instance modifications)

#### Description
Add per-ownership modification storage — do **not** alter shared catalog stats when one player enchants their weapon.

Option A (preferred): `character_item_modifications` table (`character_item_id`, `kind`, `payload` JSON, `created_at`).

Option B: `modifications` JSON column on `character_items`.

Repository API:
- `listModifications(characterItemId)`
- `addModification(characterItemId, modification)`
- `removeModification(id)` (for future dispel)
- cascade delete with `character_items` / campaign delete

Migration: existing rows have zero modifications; behavior unchanged.

#### Acceptance Criteria
- [x] Modifications are keyed to `character_items.id`, not `items.id`
- [x] Two characters owning the same catalog longsword can have different modifications
- [x] `deleteCampaign` removes modification rows
- [x] Unit tests cover add, list, cascade

### 037.3 Engine multi-component damage + resistance

#### Description
Pure `/engine` functions:

- `resolveWeaponDamage(components: DamageComponent[], rng, isCritical): DamageBreakdown`
  - roll each component (crit doubles dice per 037.1)
  - return per-component raw totals + types + grand total
- `resolveWeaponDamageAgainstProfile(components, rng, isCritical, resistanceProfile): DamageBreakdown`
  - apply `applyResistance` per component before summing

Replace or extend `resolvePlayerAttackDamage` to accept `DamageComponent[]` instead of a single `DamageRoll`.

`DamageBreakdown` for UI/events: `{ components: [{ type, rolled, afterResistance }], total }`.

#### Acceptance Criteria
- [x] 1d8 physical + 1d6 fire returns two line items and correct sum
- [x] Fire-resistant target halves only the fire component
- [x] Crit doubles dice on both components
- [x] No DB/LLM imports

### 037.4 Engine modification templates + validation caps

#### Description
Validate agent/IPC modification proposals before persist:

- `addDamageComponent`: allowed types from `DamageType` enum; `diceCount` 1–2; `diceSize` ≤ 8 for enchantment adds (document table); max **2** total components on a weapon (base + one enchant in v1)
- reject modifications on non-weapon equipped items
- `setDescription` / `setDisplayName`: length caps only

`validateModification(weaponBaseProfile, existingMods, proposal): ValidatedModification | rejection reason`

Enchanting an already-enchanted weapon (2 components) rejects further `addDamageComponent` unless dispel exists (v1: reject).

#### Acceptance Criteria
- [x] 1d6 fire add on longsword validates
- [x] 3d12 fire add rejects
- [x] Third component on same weapon rejects
- [x] Unit tests for cap table

### 037.5 DM item-modification intent + schema

#### Description
Extend DM intent (or add dedicated `resolveItemModification` call when player input targets owned gear) for actions like *“I enchant my greatsword to deal fire damage”*, *“I infuse my blade with frost”*.

**Input context:** equipped weapon `character_item` id, base weapon name/stats summary, existing modifications, player input.

**Output schema:**
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

Optional flavor fields: `displayName`, `description` overlay (instance-only).

Prompt: engine clamps dice; agent must not invent totals beyond template; modification must match player intent; require player owns and has weapon equipped or in inventory (document rule).

#### Acceptance Criteria
- [x] Enchant-fire input on equipped longsword returns `addDamageComponent` fire 1d6
- [x] Invalid target id rejected
- [x] Schema validation with retries
- [x] Unit tests with scripted provider

### 037.6 Modification persist pipeline

#### Description
After DM modification proposal passes `validateModification` (037.4):

1. persist row via 037.2 repositories
2. append `item_modified` event with payload
3. do **not** call `upsertCatalogItemByName` or mutate `items.mechanical_properties`

Optional: update instance `displayName` / `description` overlay fields on modification record for sheet UI.

Return modification summary on `TurnResult` for renderer refresh.

#### Acceptance Criteria
- [x] Persisted modification survives DB reopen
- [x] Global catalog item unchanged after enchant (byte-level or field equality test)
- [x] Invalid proposals do not write rows
- [x] Integration test: enchant then list modifications

### 037.7 Equipped weapon component merge + attack wiring

#### Description
Replace `getEquippedWeaponDamageRoll` with `getEquippedWeaponDamageProfile(db, characterId): WeaponDamageProfile`:

1. read equipped weapon catalog `WeaponProperties` → base `[{ damageRoll, damageType }]`
2. append validated `addDamageComponent` mods from 037.2
3. apply instance display overlays for UI only

Update `resolvePlayerEquippedAttackDamage` (and 031.5 player-vs-NPC attack when present) to:
- build profile
- call `resolveWeaponDamageAgainstProfile` with target resistance when known
- return `DamageBreakdown` on `TurnResult` / combat events for exposition

Deprecate single-roll path internally; keep unarmed as one physical component.

#### Acceptance Criteria
- [x] Enchanted longsword attack returns breakdown with physical + fire lines
- [x] Unmodified weapon behavior matches pre-epic totals (regression test)
- [x] NPC with fire resistance takes reduced fire portion only
- [x] `turnIpc` test with scripted enchant + attack

### 037.8 Character sheet weapon detail UI

#### Description
On equipped weapon in inventory/sheet, show:

- base damage line(s) from catalog
- modification lines (e.g. “+ 1d6 fire (enchanted)”)
- instance display name / description if overlaid

Refresh after modification turn via existing inventory IPC.

#### Acceptance Criteria
- [x] Equipped enchanted weapon lists all damage components
- [x] Unmodified weapon shows single line as today
- [x] Instance flavor name visible when set

### 037.9 Modification events + narration grounding

#### Description
Append `item_modified` events; include equipped weapon profile summary in DM narration context so later turns remember the blade is fire-enchanted.

Log book optional `thing` entry when enchant is a major beat (agent-proposed or rule-based).

#### Acceptance Criteria
- [x] Modification appends event with component payload
- [x] `assembleNarrationContext` includes equipped weapon modification summary
- [x] Unit test context assembly

### 037.10 End-to-end enchantment smoke test

#### Description
Scenario:
1. Player has longsword equipped (seed or grant)
2. Player submits enchant-fire intent → modification persisted (1d6 fire)
3. Sheet shows 1d8 physical + 1d6 fire (or template-appropriate base + fire)
4. Player attacks (mock NPC or engine-only harness) → `DamageBreakdown` has two components
5. Restart app → modification still present

Deliver: `src/db/weaponEnchantmentSmoke.test.ts`, `docs/runbooks/weapon-enchantment-smoke-test.md`

#### Acceptance Criteria
- [x] Full loop automated in test harness
- [x] Catalog longsword row identical before/after enchant
- [x] Attack uses both components
- [x] Runbook for manual dev verification
