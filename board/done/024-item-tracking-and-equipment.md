# EPIC: Item tracking, equipment, and AI-driven item creation

Replace the untyped `inventory: unknown[]` blob on characters with a real item system: a starter catalog of basic weapons/armor/potions/magic items the DM agent can pull from, equip slots that actually feed the AC/damage formulas, and a retrieve-first-then-create flow (mirroring the preseeded-catalog pattern in epic 023) so the DM agent can also invent a brand-new item on the fly when the story calls for it — with the engine, not the agent, always deriving the item's actual mechanical numbers from a fixed template, the same guardrail already used for homebrew features and DC clamping.

Broken down into sub-tickets 024.1-024.11. This epic is done when all of them are.

024.1 item + ownership DB schema · 024.2 starter item catalog seed · 024.3 item mechanical templates by type/rarity · 024.4 equip/unequip engine logic + slot rules · 024.5 wire equipped armor into AC · 024.6 wire equipped weapon into damage resolution · 024.7 DM agent item proposal flow (retrieve or propose new) · 024.8 AI-proposed item canonicalization · 024.9 grant/consume/remove item flows · 024.10 character sheet inventory + equip UI · 024.11 end-to-end item system smoke test

## Sub-tickets

### 024.1 Item + ownership DB schema

#### Description
Add a normalized `items` table (canonical item definitions: name, type, mechanical properties, rarity, source) and a `character_items` ownership table (character, item, quantity, equipped slot), replacing the untyped `inventory` JSON blob on `characters` as the source of truth for what a character owns.

#### Acceptance Criteria
- [x] `items` table stores type (`weapon`/`armor`/`potion`/`magicItem`/`misc`), name, description, rarity, mechanical properties, and an equip slot (`weapon`/`armor`/`trinket`/`null`)
- [x] `character_items` table links a character to an item with quantity and an equipped boolean/slot, with a foreign key to both `characters` and `items`
- [x] A migration moves existing `characters.inventory` JSON rows into the new tables without data loss
- [x] Repository functions exist for: list a character's items, add an item to a character, remove/decrement an item, set/clear an equipped slot
- [x] Unit tests cover the migration and round-trip repository behavior

### 024.2 Starter item catalog seed

#### Description
Seed the `items` catalog (024.1) with a basic starter set the DM agent can pull from immediately: a handful of weapons, the existing armor tiers (light/medium/heavy, matching `ArmorTier`), a few potions, and one or two simple magic items.

#### Acceptance Criteria
- [x] At least 5 weapons are seeded with distinct damage rolls appropriate to their flavor (e.g. dagger vs greatsword)
- [x] Armor items are seeded for each existing `ArmorTier` (light/medium/heavy) plus an unarmored option
- [x] At least 2 potions are seeded with a defined effect (e.g. HP recovery amount)
- [x] At least 1 magic item is seeded with a defined mechanical bonus
- [x] Seed data loads idempotently (re-running the seed does not duplicate catalog rows)

### 024.3 Item mechanical templates by type/rarity

#### Description
Define fixed, engine-owned templates that derive an item's actual mechanical numbers (damage dice, armor bonus, potion effect magnitude) from its type and a rarity/power tier — the same guardrail pattern as `featureTemplate.ts`'s homebrew feature templates and the DC-clamping pattern: the DM agent may propose an item's flavor and a rough power tier, but never the final numbers.

#### Acceptance Criteria
- [x] A pure, testable function maps (item type, rarity tier) to concrete mechanical properties (e.g. weapon damage dice, armor bonus, potion HP restored)
- [x] Rarity tiers are clamped to a fixed, sane range — an out-of-range or invalid tier from agent input is rejected/clamped, not trusted as-is
- [x] The same item type + tier always derives the same mechanical properties (deterministic, no randomness)
- [x] Unit tests cover each item type across its valid rarity tier range, plus clamping of an out-of-range tier

### 024.4 Equip/unequip engine logic + slot rules

#### Description
Implement the engine logic for equipping and unequipping owned items into the weapon/armor/trinket slots, enforcing one item per slot and that only items with a matching equip slot can be equipped there.

#### Acceptance Criteria
- [x] Equipping an item into a slot that already holds an item automatically unequips the previous one (no two items in the same slot)
- [x] Attempting to equip an item with no equip slot (e.g. a potion) or a mismatched slot is rejected with a typed result, not a silent no-op or crash
- [x] Unequipping a slot leaves the item in the character's inventory (not deleted)
- [x] Equip state is read from and written to the `character_items` table from 024.1
- [x] Unit tests cover equip, swap-on-equip, unequip, and the invalid-slot rejection path

### 024.5 Wire equipped armor into AC

#### Description
Make `computeAC` derive its armor tier from the character's currently equipped armor item (024.4) instead of a manually-chosen `ArmorTier`, so equipping/unequipping armor actually changes AC.

#### Acceptance Criteria
- [x] A character's effective AC reflects their currently equipped armor item's armor tier, falling back to `none` when no armor is equipped
- [x] Unequipping armor immediately drops AC back to the unarmored value on the next check/combat resolution
- [x] Existing `computeAC`/`ArmorTier` engine logic is reused, not duplicated
- [x] Unit tests cover AC with no armor equipped, with each armor tier equipped, and immediately after unequipping

### 024.6 Wire equipped weapon into damage resolution

#### Description
Make the player's attack damage resolution use their currently equipped weapon's damage roll (024.4) instead of any hardcoded default, falling back to an unarmed/improvised damage roll when no weapon is equipped.

#### Acceptance Criteria
- [x] A resolved player attack uses the equipped weapon's damage dice/modifier from the item catalog
- [x] A character with no weapon equipped still resolves attacks using a defined unarmed/improvised damage roll, not an error
- [x] Switching equipped weapons changes the damage roll used on the next attack
- [x] Unit tests cover attack resolution with a weapon equipped, with no weapon equipped, and after switching weapons

### 024.7 DM agent item proposal flow (retrieve or propose new)

#### Description
When narration involves loot, a reward, or a shop, let the DM agent either reference an existing catalog item by id or propose a brand-new item (name, description, type, rough rarity tier) in its structured narration response. The agent never supplies final mechanical numbers — only flavor and a tier, same as the homebrew-feature flow; the engine resolves the actual properties via the 024.3 templates before anything is granted to a character.

#### Acceptance Criteria
- [x] The DM agent's narration schema supports referencing an existing item by id and proposing a new item by name/description/type/rarity tier
- [x] A referenced item id that doesn't exist in the catalog is rejected/ignored rather than crashing the turn
- [x] A proposed new item never reaches a character's inventory with agent-supplied mechanical numbers — only engine-derived ones (024.3)
- [x] Unit tests cover: granting an existing catalog item, proposing a new item, and an invalid/unknown item id reference

### 024.8 AI-proposed item canonicalization

#### Description
Persist an AI-proposed new item (024.7) as a new row in the shared `items` catalog rather than a one-off blob attached only to the receiving character, so the same item can be recognized and reused consistently if it comes up again later (e.g. another NPC mentions the same named artifact).

#### Acceptance Criteria
- [x] An AI-proposed new item is inserted into the `items` catalog the first time it's granted, then referenced by id for that grant
- [x] A second proposal with the same name resolves to the existing catalog entry instead of creating a duplicate
- [x] Canonicalized items are indistinguishable from preseeded ones to the rest of the system (same shape, same equip/AC/damage wiring)
- [x] Unit tests cover first-time creation and duplicate-name reuse

### 024.9 Grant/consume/remove item flows

#### Description
Implement the engine-authoritative flows for an item entering or leaving a character's inventory: granting (loot/reward/shop purchase, tying into the existing currency debit guardrail for purchases), consuming (e.g. drinking a potion applies its effect and removes it), and removing/losing an item (destroyed, sold, dropped).

#### Acceptance Criteria
- [x] Granting an item increases the character's owned quantity (or adds a new row) without agent control over the resulting state
- [x] Purchasing an item debits currency via the existing engine currency guardrail before the item is granted; insufficient funds blocks the grant
- [x] Consuming a potion applies its engine-derived effect (024.3) and decrements/removes it from inventory in the same operation
- [x] Removing/losing an item decrements quantity or removes the row, and unequips it first if it was equipped
- [x] Unit tests cover grant, paid purchase (success and insufficient-funds), consume, and remove-while-equipped

### 024.10 Character sheet inventory + equip UI

#### Description
Replace the character sheet's current plain inventory list with a real view: equipped slots (weapon/armor/trinket) shown distinctly, the rest of the owned items below, and equip/unequip controls per item.

#### Acceptance Criteria
- [x] Character sheet shows currently equipped weapon/armor/trinket distinctly from the general inventory list
- [x] Each equippable owned item has an Equip/Unequip control reflecting its current state
- [x] Equipping an item that fills an already-occupied slot updates the UI to show the swap (old item returns to inventory, new item shown as equipped)
- [x] Potions/consumables show a Use control instead of Equip
- [x] UI is exercised against the real running app (no automated component-rendering test infra in this repo) per this project's manual-smoke convention for UI

### 024.11 End-to-end item system smoke test

#### Description
Validate the full item loop in a real running app: the DM agent grants a brand-new AI-created item through play, the player equips it and sees the mechanical effect (AC or damage change), uses a consumable, and a purchase correctly debits currency.

#### Acceptance Criteria
- [x] Playing through a scene where the DM narrates a loot/reward moment results in a new item appearing in the character's inventory, sourced from either the catalog or a freshly canonicalized AI-proposed item
- [x] Equipping the new item changes the character's AC or attack damage as expected for its type
- [x] Using a consumable potion applies its effect and removes it from inventory
- [x] A shop-style purchase debits currency correctly and blocks when funds are insufficient
- [x] Restarting the app preserves equipped state and inventory contents
