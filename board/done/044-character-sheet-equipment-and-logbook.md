# EPIC: Character sheet overlay, expanded equipment slots, inventory modals, and log book depth

Epic **024** normalized items and equip slots; **037** added per-instance weapon modifications; **025** added the read-only log book. The **character sheet** (`CharacterSheetBody`) still crams vitals, journal, inventory, equipped slots, and a log-book button into one scrollable column — and epic **043** will add play-mode sheet tabs on top without solving the underlying equipment and knowledge UX.

Meanwhile the **equipment model is incomplete**:

| Gap | Today |
|-----|--------|
| **Slots** | Flat `weapon` \| `armor` \| `trinket` only (`EQUIP_SLOTS` in `src/shared/items/types.ts`) |
| **Handedness** | Greataxe and dagger both use `equipSlot: 'weapon'` — no 1H/2H, no off-hand |
| **Shields** | No shield item type or slot; no off-hand AC |
| **Accessories** | One `trinket` slot; boots, belts, greaves, rings cannot coexist |
| **Trinket bonuses** | `MagicItemProperties.acBonus` / `attackBonus` stored but **not wired** into `computeAC` or attack resolution |
| **Commerce** | `purchaseItemForCharacter` exists in `itemFlows.ts` but has no DM narration path and no UI |
| **Inventory UI** | Equip button uses `item.equipSlot` with no slot picker; `removeOwnedItem` not exposed; equip errors silent |
| **Log book** | Read-only modal; DM writes via agent only; no edit/delete/search; `relatedEntityId` unused in UI |

This epic delivers a **polished character sheet overlay** and the **mechanical + UX depth** 024/025 left unfinished: multi-slot equipment (1H/2H, shield, accessories), inventory/currency as dedicated modals, equip-from-backpack flows, commerce in play, and a stronger log book with DM curation controls.

Builds on **024** (items/equip), **025** (log book), **027** (journal — keep separate), **037** (weapon modifications), **043** (play sheet chrome/tabs — 043.8 opens Gear; this epic owns modal depth).

Broken down into sub-tickets **044.1–044.16**. This epic is done when all are complete and `npm test`, `npm run lint`, and `npm run build` pass.

## Target equipment model

```
┌─────────────────────────────────────────────────────────┐
│ Character sheet overlay (full modal)                     │
│  ┌─────────────┐  ┌──────────────────────────────────┐  │
│  │ Paper doll  │  │ Vitals · AC breakdown · Currency │  │
│  │ / slot grid │  │ [Inventory] [Log Book] [Journal] │  │
│  └─────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

Body slots:
  armor      — chest/body armor (light/medium/heavy tier)
  mainHand   — primary weapon
  offHand    — 1H weapon, shield, or empty

Accessory slots (expanded trinkets):
  head, hands, feet, belt, neck, ring1, ring2

Rules (engine-owned):
  • twoHand weapon in mainHand → clears offHand; blocks shield/second weapon
  • shield in offHand → blocks twoHand mainHand; grants shield AC bonus
  • dual 1H → mainHand weapon + offHand weapon allowed (document any attack penalty in spec — default: none for v1)
  • each accessory slot holds at most one item; item declares which slot(s) it may occupy
```

Inventory and currency open as **separate modals** from the sheet overlay — not inline scroll sections. Equipping always flows **from inventory → slot** (with slot picker when an item could fit multiple accessory slots).

## Definition of done

- `src/shared/items/SPEC.md` documents slot model, handedness, shield rules, and accessory mapping
- Schema + types support `mainHand`/`offHand`/accessory slots; migration maps existing `weapon`→`mainHand`, `trinket`→best-effort accessory slot
- Engine enforces 2H/shield/dual-wield conflict rules; trinket/accessory bonuses affect AC and attack
- Starter catalog includes shields, 2H weapons, and representative accessories (boots, belt, ring)
- DM narration can grant/spend currency and complete shop purchases via engine-clamped prices
- Character sheet opens as a **full overlay modal** from play rail / hub; inline cramming removed from default play path
- **Inventory modal**: list, equip-to-slot, unequip, use potion, drop/remove; surfaces equip errors
- **Currency** visible with transaction feedback after grants/purchases
- **Log book modal** redesigned: search, category filter, entity links; DM can add/edit/delete entries
- DM agent log-book guidance tightened (thing vs `itemGrants`, `relatedEntityId` usage)
- Smoke: dual-wield + shield swap + buy item + trinket AC change + DM log correction

044.1 equipment slot spec · 044.2 schema migration + shared types · 044.3 engine equip conflict rules · 044.4 accessory bonus wiring (AC/attack) · 044.5 shield item type + off-hand AC · 044.6 catalog seed expansion (handedness, shields, accessories) · 044.7 commerce loop (currency grants + purchases) · 044.8 inventory IPC (drop/remove, equip-to-slot) · 044.9 character sheet overlay redesign · 044.10 inventory management modal · 044.11 currency display + shop feedback · 044.12 equipment slot panel + AC breakdown · 044.13 log book modal redesign · 044.14 log book CRUD + IPC · 044.15 DM log book agent controls · 044.16 tests + smoke runbook

## Relationship to epic 043

- **043** owns play-shell layout, session chrome, and lightweight play-rail tabs (Combat / Stats / Gear / Journal shortcuts).
- **044** owns the **full sheet overlay** and **inventory/currency/log-book modals** opened from those shortcuts.
- Implement **043.8** first with stub buttons that open placeholders; **044.9–044.13** replace placeholders with real modals.

## Out of scope

- Multi-denomination currency (copper/silver/gold) — single integer `characters.currency` remains
- Armor/ trinket enchantment modifications (037 is weapon-only today)
- Per-stack item instance splitting for duplicate enchanted weapons (document as follow-up if needed)
- Player-authored log book entries (knowledge stays DM-curated)
- Mod-pack import (**m003**)

## Open decisions (resolve in 044.1)

- **Dual-wield attack modifier:** no penalty (simplest) vs off-hand damage die only vs disadvantage on off-hand — pick one for v1
- **Ring items:** two fixed slots (`ring1`/`ring2`) vs single `ring` slot
- **DM log edit UI:** dev-only panel vs always-available "curate knowledge" mode in play

## Sub-tickets

### 044.1 Equipment slot model spec

#### Description

Author `src/shared/items/SPEC.md` defining the expanded slot system, replacing the implicit 3-slot model in `equipment.ts`.

Document:

- Slot enum: `armor`, `mainHand`, `offHand`, `head`, `hands`, `feet`, `belt`, `neck`, `ring1`, `ring2`
- `WeaponHandedness`: `oneHand` | `twoHand` — 2H occupies both hands logically
- `OffHandItemKind`: `weapon` | `shield` — for items equippable in `offHand`
- Accessory items declare `equipSlot` as one accessory slot; `magicItem` type maps to accessory slots (not a single `trinket`)
- Equip conflict matrix (2H ↔ offHand, shield ↔ 2H, dual 1H allowed)
- AC aggregation order: base + armor tier + shield + accessory `acBonus` sum (document caps)
- Attack aggregation: proficiency + agility + accessory `attackBonus` + weapon profile
- Migration mapping from legacy `weapon`/`armor`/`trinket` rows
- Resolve open decisions above

#### Acceptance Criteria

- [x] Spec checked in with worked examples: greatsword+empty off-hand, sword+shield, handaxe+sword, boots+belt+ring
- [x] Conflict rules are pure functions spec'd for unit testing in 044.3
- [x] Explicit non-goals documented (multi-currency, non-weapon enchantments)

---

### 044.2 Schema migration + shared types

#### Description

Expand `EQUIP_SLOTS`, `EquipSlot`, and DB constraints in `schema.ts` (`equipped_slot` CHECK).

- Add `WeaponHandedness` to `WeaponProperties` (required for weapons)
- Add `ShieldProperties` or extend `ArmorProperties` with `kind: 'shield'` + `acBonus`
- Extend `MagicItemProperties` with optional `accessorySlot` hint
- Migration: `weapon` → `mainHand`, `armor` → `armor`, `trinket` → `ring1` (or nearest accessory by item name heuristics + manual seed fixups)
- Update `itemCanonicalization.ts` default equip slots for new item types

#### Acceptance Criteria

- [x] Forward-only migration applies on existing saves without data loss
- [x] `EQUIP_SLOTS` and CHECK constraint match spec
- [x] Unit tests: migration round-trip on fixture DB with legacy equipped items
- [x] `CatalogItem` / `CharacterItemRow` types updated; no `any` escapes

---

### 044.3 Engine equip conflict rules

#### Description

Replace flat `validateEquip` / `slotsToClearOnEquip` in `src/engine/equipment.ts` with spec rules:

- `validateEquip(item, targetSlot, currentlyEquipped)` — slot match + conflict checks
- `slotsAffectedOnEquip(item, targetSlot)` — returns all slots to clear (e.g. 2H clears `offHand`; equipping `offHand` shield clears incompatible `mainHand` if 2H equipped)
- `equipCharacterItem` repository calls engine before write
- Dual 1H: equipping second 1H weapon into `offHand` when `mainHand` holds 1H weapon succeeds

#### Acceptance Criteria

- [x] Unit tests cover every row in spec conflict matrix
- [x] Swap-on-equip still works per slot
- [x] Invalid equips return typed `EquipFailureReason` including new reasons (`two_hand_blocks_off_hand`, `shield_blocks_two_hand`, etc.)
- [x] Existing 024.4 tests updated, not deleted

---

### 044.4 Accessory bonus wiring (AC and attack)

#### Description

Wire equipped accessory `acBonus` and `attackBonus` into combat:

- `getEquippedAccessoryBonuses(db, characterId)` — sum bonuses from all equipped accessory slots
- Feed into `computeAC` path in `turnIpc.ts` / `combatResolvers.ts`
- Feed into `computeAttackModifier` / player attack resolution
- `Ring of Warding` (+1 AC) and similar seed items finally matter mechanically

#### Acceptance Criteria

- [x] Unit tests: accessory AC changes effective AC; removing accessory reverts
- [x] Unit tests: attack bonus from ring/trinket affects player attack modifier
- [x] Bonuses documented as additive with documented cap in spec (if any)
- [x] No double-counting armor tier vs accessory bonuses

---

### 044.5 Shield item type + off-hand AC

#### Description

Add shield as first-class off-hand equipment:

- Shield catalog entries with `equipSlot: 'offHand'` and `acBonus` (separate from body armor tier)
- `getEquippedShieldBonus(db, characterId)` integrated into AC breakdown
- Body `armor` slot remains chest armor tier only — shield does not replace armor
- Character sheet / combat HUD show shield contribution in AC breakdown

#### Acceptance Criteria

- [x] Equip wooden shield → AC increases; unequip → reverts
- [x] Cannot equip 2H weapon while shield equipped (and vice versa) per 044.3
- [x] At least one shield seeded in catalog
- [x] AC breakdown UI lists: base + agility + armor tier + shield + accessories

---

### 044.6 Catalog seed expansion (handedness, shields, accessories)

#### Description

Update `seedStarterItems.ts` and any catalog tests:

| Category | Examples |
|----------|----------|
| 2H weapons | Greataxe (`twoHand`), Greatsword |
| 1H weapons | Handaxe, Shortsword, Dagger |
| Shields | Wooden shield, Kite shield |
| Accessories | Boots of speed (feet), Iron greaves (feet), Leather belt (belt), Ring of Warding (ring1) |

Set `handedness` on all weapons. Retire misleading single `trinket` slot assignments.

#### Acceptance Criteria

- [x] Every weapon has correct `handedness`
- [x] At least 2 shields, 3 accessory slot varieties (feet/belt/ring), 2H and 1H pairs
- [x] Seed idempotent
- [x] `itemSystemSmoke.test.ts` updated for new slots

---

### 044.7 Commerce loop (currency grants + purchases)

#### Description

Close the unfinished 024.9 commerce path:

- Engine price table: `itemType` + `rarity` → gold cost (pure function in `src/engine/itemPricing.ts`, clamped)
- Extend DM `NarrationResult` schema: `currencyGrants?: { amount: number }`, `itemPurchases?: { catalogItemId: string }` (price from engine, not agent)
- Persist in turn pipeline: `creditCurrency` / `debitCurrency` + `purchaseItemForCharacter`
- Insufficient funds: reject purchase, narration still succeeds, typed side-effect result for optional DM acknowledgment

#### Acceptance Criteria

- [x] DM can narrate a shop sale that debits currency and adds item to inventory
- [x] DM can grant currency via narration
- [x] Agent cannot set arbitrary prices — engine owns amounts
- [x] Unit + integration tests for grant, purchase, insufficient funds
- [x] Closes gap where `purchaseItemForCharacter` is test-only

---

### 044.8 Inventory IPC (drop/remove, equip-to-slot)

#### Description

Expose missing inventory operations:

- IPC: `characters:dropItem` (or `removeOwnedItem`) with quantity support
- IPC: `characters:equipItem` accepts explicit `slot` when item supports multiple accessory targets
- Return typed errors to renderer (surface toast/inline message)
- Optional: split quantity stacks when equipping duplicates — document deferral if not implemented

#### Acceptance Criteria

- [x] Drop/remove reduces quantity; removes row at zero
- [x] Equip-to-slot picker data available to UI (list valid slots per item)
- [x] All `EquipFailureReason` values surfaced in IPC response
- [x] Preload + typed channel wiring matches existing item IPC pattern

---

### 044.9 Character sheet overlay redesign

#### Description

Replace the inline `CharacterSheetBody` scroll stack as the **primary play/hub sheet experience**:

- New `CharacterSheetOverlay` — full-screen or large centered modal (consistent with `CharacterLogBookModal` / `LevelUpModal` scrim pattern)
- Entry points: play rail (043.8), hub cast rail, existing sheet toggle
- Overlay summary panel: portrait, name, class/level, HP, AC breakdown stub (filled in 044.12), currency chip
- Action buttons: **Inventory**, **Log Book**, **Journal** (journal stays 027 content, separate modal or tab)
- `CharacterSheetBody` retained for guided creation / setup flows or becomes thin wrapper

#### Acceptance Criteria

- [x] Play mode opens sheet overlay, not infinite scroll in 280px rail
- [x] Overlay dismisses via backdrop, Escape, and close button
- [x] Campaign/session state unaffected by open/close
- [x] UI test: open from play rail, close, reopen

---

### 044.10 Inventory management modal

#### Description

Dedicated `InventoryModal` opened from sheet overlay:

- **Backpack** list: all `equipped_slot IS NULL` items with quantity, rarity, type icons
- **Equip** action → slot picker when multiple valid slots; direct equip when unambiguous
- **Use** on potions (existing `consumeItem`)
- **Drop** with confirmation
- **Equipped** section at top with quick unequip (or link to equipment panel 044.12)
- Show `CharacterWeaponProfile` for weapons; modification summary from 037

#### Acceptance Criteria

- [x] Equip handaxe to `mainHand`, sword to `offHand` from backpack in UI
- [x] Equip failure shows user-visible message (not silent)
- [x] Potion use updates HP and removes/decrements item
- [x] Modal refreshes after equip/drop/use without closing
- [x] UI tests for equip picker and error display

---

### 044.11 Currency display + shop feedback

#### Description

- Persistent currency chip on sheet overlay and inventory modal header
- After turn with `currencyGrants` or `itemPurchases`, animate or toast balance change
- Shop purchase failure (insufficient funds) surfaced in play UI when turn result includes purchase rejection
- Optional: simple transaction log section in inventory modal (last 5 debits/credits) — dev-facing OK

#### Acceptance Criteria

- [x] Currency matches `characters.currency` after grants/purchases/rest
- [x] Player sees balance change after shop narration turn
- [x] Insufficient funds message visible without opening devtools
- [x] UI test: currency display updates on mock IPC refresh

---

### 044.12 Equipment slot panel + AC breakdown

#### Description

Visual equipment management inside sheet overlay (alongside or behind inventory modal):

- Slot grid or paper-doll layout for all slots from 044.1
- Each slot: icon, item name, quick unequip, empty-slot affordance → opens inventory filtered to equippable items
- **AC breakdown** panel: base 10 + agility + armor tier + shield + accessories = total
- **Attack summary** for equipped `mainHand` weapon (037 profile) + off-hand note if dual-wielding
- Replaces `CharacterEquippedSlots` 3-slot list

#### Acceptance Criteria

- [x] All spec slots render with correct equipped item or empty state
- [x] AC breakdown matches engine calculation exactly (unit test fixture IDs)
- [x] Click empty slot → inventory filtered to valid items for that slot
- [x] 2H weapon shows both hands occupied visually

---

### 044.13 Log book modal redesign

#### Description

Rebuild `CharacterLogBookModal` UX:

- Search across title + content
- Category tabs or filter chips (event / place / person / beast / thing)
- Entry cards: title, content, in-game date learned, `relatedEntityId` link when resolvable (NPC name, region name, item name)
- Auto-refresh entries when modal stays open across turns (subscribe to turn completion / refresh token from play controller)
- Distinct visual identity from journal (knowledge vs personal narrative)

#### Acceptance Criteria

- [x] Search filters entries client-side without new IPC
- [x] Category filter works per tab/chip
- [x] Related entity link navigates or shows tooltip with resolved name
- [x] New DM-written entries appear after turn without manual modal reopen
- [x] Empty states per category preserved from 025

---

### 044.14 Log book CRUD + IPC

#### Description

Append-only log book gets DM curation paths:

- Repository: `updateLogEntry`, `deleteLogEntry` (by id + character scope)
- IPC: `logBook:updateEntry`, `logBook:deleteEntry`, `logBook:createEntry` (DM/manual — not player-facing in v1)
- Authorization: only callable from trusted renderer paths (play DM tools UI in 044.15, not guest preload)
- Audit: `updated_at` column or append-only edit log — pick simplest (in-place update OK for v1)

#### Acceptance Criteria

- [x] Create manual entry with category, title, content, optional `relatedEntityId`
- [x] Edit title/content of existing entry
- [x] Delete entry removes from DB and narration context window on next turn
- [x] Character isolation enforced — cannot edit another character's entries
- [x] Unit tests for CRUD + isolation

---

### 044.15 DM log book agent controls

#### Description

Tighten agent + DM tooling for log book quality:

- **Agent prompt** (`dm.ts`): clearer split — `itemGrants` for loot mechanics, `logBookEntries` category `thing` for *knowledge about* an item (not granting it); encourage `relatedEntityId` when entity known
- **Agent schema**: optional `logBookAmendments?: { entryId, title?, content? }` and `logBookDeletions?: string[]` for DM self-correction on same turn (validated against character scope)
- **DM curate UI** in log book modal (edit/delete buttons per entry when "Curate" mode toggled) — uses 044.14 IPC
- Windowing tests updated if amendment/deletion affects `logBookWindow.ts`

#### Acceptance Criteria

- [x] Agent guidance documented in prompt; smoke shows thing entry links to granted item id when both emitted
- [x] Amend/delete proposals persist and reflect in next `assembleNarrationContext`
- [x] Manual curate UI edits entry without corrupting other categories
- [x] Invalid `entryId` in amendment dropped safely
- [x] `dmLogBook.test.ts` extended for amendments

---

### 044.16 Tests, smoke runbook, and integration with 043

#### Description

- `src/db/equipmentSlotsSmoke.test.ts` (or extend `itemSystemSmoke.test.ts`): 2H equip clears off-hand, sword+shield, dual 1H, accessory AC, purchase flow
- `docs/runbooks/character-sheet-equipment-smoke-test.md` — manual steps for overlay, inventory, shop, log curate
- Log book smoke extension: search, DM edit, post-turn refresh
- Update **043** epic note or 043.8 criteria to reference 044 modal entry points
- README roadmap line for 044

#### Acceptance Criteria

- [x] Automated smoke covers equip conflicts + trinket AC + purchase
- [x] Log book CRUD covered in integration test
- [x] Runbook checked in with manual desktop steps
- [x] `npm test`, `npm run lint`, `npm run build` pass with epic complete
