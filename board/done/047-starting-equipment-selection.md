# EPIC: Starting equipment selection (archetype loadouts)

After mechanical character setup (name, archetype, ability scores, party, death mode, portraits) the player currently jumps straight to **Tell me about yourself** — the guided identity interview (epic **026**). There is no step to choose starting gear even though the item system (**024**), expanded equip slots (**044**), and spell catalog (**023**) already exist.

This epic inserts an **equipment selection** onboarding page between `CharacterSetup` and guided identity. Offered choices are **archetype-driven**: each of the five seed archetypes gets a curated package of weapons, armor, off-hand options, and (for spellcasting archetypes) level-1 catalog spells to pick from. Selections are persisted as owned + equipped items and `knownSpellKeys` before the identity interview begins, so the DM interview and opening scene can reference what the character actually carries.

Builds on **009** (character setup UI), **023** (spell catalog + archetype hints), **024** (items/equip), **026** (guided creation stage machine), **044** (mainHand/offHand/armor slots), **046** (spellbook display of `knownSpellKeys`).

Broken down into sub-tickets **047.1–047.11**. This epic is done when all are complete and `npm test`, `npm run lint`, and `npm run build` pass.

## Target UX flow

```
Campaign review
  → Character setup (stats, archetype, party, death mode, portraits)
  → Equipment selection  ← NEW
  → Tell me about yourself (guided identity)
  → Help me set the stage (opening scene)
  → Play
```

```
Equipment selection page
  ┌────────────────────────────────────────────────────────────┐
  │  Choose your starting gear                                  │
  │  Archetype: Fighter                                         │
  │                                                             │
  │  Weapon (pick 1)     [ Longsword ] [ Handaxe ] [ Shortsword ]│
  │  Armor (pick 1)      [ Chain mail ] [ Leather ] [ Unarmored ]│
  │  Off-hand (pick 1)   [ Shield ] [ Second weapon ] [ Empty ] │
  │                                                             │
  │  — spell section hidden for non-casters —                   │
  │                                                             │
  │  Spells (pick 2)     [ ] Rallying Strike  [ ] Shield Bash … │
  │                                                             │
  │  [ Back ]                              [ Tell me about yourself ] │
  └────────────────────────────────────────────────────────────┘
```

## Archetype package model (v1)

Engine-owned spec (`src/engine/startingLoadout/SPEC.md`) — not LLM-generated:

| Archetype | Weapon options | Armor options | Off-hand | Spells (pick N) |
|-----------|----------------|---------------|----------|-----------------|
| **fighter** | longsword, handaxe, greataxe | chain mail, leather, unarmored | shield, handaxe, empty | pick 1 from level-1 fighter catalog spells |
| **rogue** | dagger, shortsword, handaxe | leather, unarmored | dagger, empty | pick 1 from level-1 rogue catalog spells |
| **mage** | dagger, handaxe | leather, unarmored | — | pick 2 from level-1 mage catalog spells |
| **cleric** | handaxe, mace (if seeded) | chain mail, leather | shield, empty | pick 2 from level-1 cleric catalog spells |
| **ranger** | longbow (if seeded), shortsword, handaxe | leather, unarmored | — | pick 2 from level-1 ranger catalog spells |

Exact item names reference **starter catalog** rows (`seedStarterItems.ts`) and **catalog_spells** keys (`SPELL_SEEDS_V1`). If a referenced item is missing from the catalog, the spec ticket adds it rather than hardcoding mechanical stats in the loadout file.

**Rules (engine-owned):**

- Every choice must be one of the offered options for that archetype — no free-form item names from the renderer.
- Two-handed weapon in `mainHand` clears/forbids off-hand shield or second weapon (reuse **044** equip conflict rules).
- Spell picks must pass existing catalog constraints (`requiresArchetype`, `minLevel <= 1`).
- Starting equipment is **free** — no currency deduction on this screen.
- Re-visiting equipment selection after advancing to identity is not allowed in v1.

## Guided-creation phase extension

Add `equipment` to `guided_creation_phase`:

`'none' | 'equipment' | 'identity' | 'opening_scene' | 'complete'`

- New player characters default to `equipment` (replacing today's default of `identity`).
- Completing equipment selection atomically grants items, equips slots, writes `knownSpellKeys`, and advances phase to `identity`.
- `stageRouting.ts` maps `equipment` → onboarding stage `equipmentSelection`.
- Play entry still requires `guided_creation_phase === 'complete'` (unchanged).
- Campaign hub second-character flow uses the same equipment step before identity.

## Definition of done

- Archetype loadout spec exists and is validated by engine unit tests
- Player characters start in `equipment` phase; migration handles existing in-progress `identity` rows safely
- IPC applies a validated loadout in one transaction (items owned, equipped, spells in stats)
- Onboarding UI offers archetype-appropriate choices with slot-conflict feedback before confirm
- `CharacterSetup` primary CTA becomes **Choose your gear**; identity kickoff only after equipment confirm
- Equipped gear and known spells appear on character sheet / spellbook before first play turn
- Smoke runbook covers setup → equipment → identity → play; mid-equipment reload resumes correctly

047.1 archetype loadout spec + seed data gaps · 047.2 guided_creation_phase `equipment` migration · 047.3 engine loadout validation · 047.4 apply-starting-loadout repository + IPC · 047.5 onboarding stage routing + resume · 047.6 equipment selection UI (weapons/armor/off-hand) · 047.7 spell selection UI (casters) · 047.8 wire CharacterSetup → equipment → identity handoff · 047.9 sheet/spellbook reflect starting gear pre-play · 047.10 smoke test + runbook update · 047.11 equipment selection back navigation · 047.12 preserve character setup on equipment back

## Relationship to other epics

- **046** (spellbook modal): starting spells selected here should appear in spellbook once identity/play is reached — no duplicate grant path.
- **044** (expanded slots): equipment selection uses `mainHand` / `offHand` / `armor` slots; reuse equip conflict engine from 044.3.
- **026** (guided creation): update 026.5/026.8 acceptance semantics — identity interview follows equipment, not mechanical setup. No change to identity/opening-scene agents beyond receiving equipped-gear context if useful later (out of scope for v1).

## Out of scope

- Buying/selling starting gear with currency
- Custom/homebrew starting items via LLM
- Equipment selection for AI party members (they stay gear-less at creation)
- Changing equipment after confirm without in-play item flows
- Level-up spell picks (remains **036** perk flow)

## Sub-tickets

### 047.1 Archetype loadout spec + seed data gaps

#### Description
Author `src/engine/startingLoadout/SPEC.md` and a typed data module mapping each seed archetype to offered weapon, armor, off-hand, and spell catalog keys. Fill any gaps in `seedStarterItems.ts` (e.g. longbow, mace, shield if not already present) so every spec reference resolves to a real catalog row.

#### Acceptance Criteria
- [x] `SPEC.md` documents per-archetype option lists, pick counts, and off-hand / 2H interaction rules
- [x] Typed `STARTING_LOADOUT_PACKAGES` (or equivalent) maps each `Archetype` to catalog item names/keys and spell keys — no inline mechanical numbers
- [x] Every referenced starter item exists in the seeded `items` catalog after migration
- [x] Unit test asserts package completeness for all five archetypes and that spell keys exist in `SPELL_SEEDS_V1`

### 047.2 `guided_creation_phase` `equipment` migration

#### Description
Extend `GUIDED_CREATION_PHASES`, DB check constraint, and `defaultGuidedPhase` so new player characters begin in `equipment`. Migrate existing rows: players already in `identity` with no equipped starting gear may stay in `identity` (or document a one-time backfill policy in the migration).

#### Acceptance Criteria
- [x] `equipment` is a valid `GuidedCreationPhase` in shared types and SQLite constraint
- [x] `createCharacter` for `kind: 'player'` defaults `guided_creation_phase` to `equipment`
- [x] Migration upgrades existing DBs without breaking players mid-identity or mid-opening-scene
- [x] Schema/migration test covers new phase value and default for new player rows

### 047.3 Engine loadout validation

#### Description
Pure engine functions that take `(archetype, selections)` and return either a validated loadout plan or typed rejection reasons (invalid item for archetype, too many/few spells, off-hand conflicts with 2H weapon, unknown catalog key).

#### Acceptance Criteria
- [x] Validator ensures each picked item is in the archetype's offered list for its slot category
- [x] Validator enforces spell pick count and level-1 / archetype constraints using catalog metadata shape (not DB)
- [x] Validator rejects 2H mainHand + shield off-hand combinations with a clear error code
- [x] Unit tests cover happy path per archetype, invalid cross-archetype picks, and conflict cases

### 047.4 Apply-starting-loadout repository + IPC

#### Description
Implement `applyStartingLoadout(db, { characterId, selections })` that runs in a single transaction: grant catalog items to `character_items`, equip into correct slots via existing equip logic, merge spell keys into `characters.stats.knownSpellKeys`, recompute AC from equipped armor, and advance `guided_creation_phase` from `equipment` to `identity`. Expose typed IPC for the renderer.

#### Acceptance Criteria
- [x] Repository uses existing item grant/equip paths (**024** / **044**) — no parallel inventory writes
- [x] Transaction is all-or-nothing; partial grants on failure are impossible
- [x] IPC rejects calls when character is not in `equipment` phase or selections fail validation
- [x] Unit tests cover grant+equip+spell write, AC update, phase advance, and rejection paths

### 047.5 Onboarding stage routing + resume

#### Description
Add `equipmentSelection` to `OnboardingStage`, update `stageForGuidedPhase`, `stageAfterCampaignSelect`, and `App.tsx` handoff so reload mid-equipment returns to the equipment page. Block guided identity kickoff until phase is `identity`.

#### Acceptance Criteria
- [x] `OnboardingStage` includes `equipmentSelection` between `characterSetup` and `guidedIdentity`
- [x] `stageForGuidedPhase('equipment')` returns `equipmentSelection`
- [x] `handleCharacterSetupComplete` transitions to `equipmentSelection`, not `guidedIdentity`
- [x] `findIncompletePlayerCharacter` treats `equipment` as incomplete guided creation
- [x] Unit tests in `stageRouting.test.ts` cover new stage and resume from `equipment` phase

### 047.6 Equipment selection UI (weapons, armor, off-hand)

#### Description
Build the equipment selection onboarding view: fetch offered options for the player's archetype (via IPC), render pick-one groups for weapon, armor, and off-hand, show live slot-conflict hints (e.g. greataxe disables shield), styled consistently with `CharacterSetup` / tavern onboarding — not `PlayView`.

#### Acceptance Criteria
- [x] Page loads offered options from IPC based on persisted player character's archetype
- [x] Player can select exactly one weapon and one armor option; off-hand group respects archetype package (hidden when not applicable)
- [x] Selecting a 2H weapon disables or clears incompatible off-hand choice with visible explanation
- [x] Confirm button stays disabled until required slot picks are made
- [x] Renderer test covers option rendering and 2H/off-hand mutual exclusion UI state

### 047.7 Spell selection UI (casters)

#### Description
For archetypes with a spell pick quota, show a multi-select (or pick-N) list of offered level-1 catalog spells with name, effect type, range, and turn cost. Martial archetypes with only one optional ability show a compact single-pick or auto-grant per spec.

#### Acceptance Criteria
- [x] Spell section appears only when archetype package has `spellPickCount > 0`
- [x] Player cannot select more than the allowed count; confirm blocked until count is exact
- [x] Spell labels come from catalog metadata returned by IPC, not hardcoded strings in the renderer
- [x] Renderer test covers pick limit enforcement and hidden section for fighter-with-one-ability edge case

### 047.8 Wire CharacterSetup → equipment → identity handoff

#### Description
Change `CharacterSetup` primary button to **Choose your gear** (or **Continue to equipment**). On equipment confirm, call apply-loadout IPC, refresh campaign detail, transition to `guidedIdentity`, and allow identity kickoff. Update hub second-character path to use the same sequence.

#### Acceptance Criteria
- [x] `CharacterSetup` no longer says **Tell me about yourself**; that label moves to equipment confirm
- [x] Successful equipment confirm refreshes detail and sets stage to `guidedIdentity`
- [x] Identity kickoff (`kickoffGuidedCreationIdentity`) does not run until loadout IPC succeeds
- [x] Campaign hub "create character" flow reaches equipment selection before identity
- [x] `guided-creation-smoke-test.md` updated to include equipment step

### 047.9 Sheet / spellbook reflect starting gear pre-play

#### Description
Verify equipped items and known spells from starting loadout appear in the character sheet overlay and spellbook (if **046** is done) during guided identity — before first play turn. Fix any missing refresh if inventory reads stale immediately after loadout apply.

#### Acceptance Criteria
- [x] After equipment confirm, character sheet shows equipped weapon/armor in correct slots
- [x] AC on sheet matches equipped armor tier
- [x] Known starting spells appear in spellbook modal (when 046 is merged) or in stats-driven spell list
- [x] No duplicate items on re-render or campaign detail refresh

### 047.10 Smoke test + runbook update

#### Description
Add `docs/runbooks/starting-equipment-smoke-test.md` and a focused DB/integration test that applies a loadout for each archetype and asserts inventory, equip state, spells, and phase transition.

#### Acceptance Criteria
- [x] Integration test applies fighter and mage loadouts end-to-end against real catalog seed data
- [x] Runbook steps: character setup → equipment picks → confirm → identity → verify sheet gear
- [x] Runbook documents mid-equipment app restart resumes on equipment page
- [x] Runbook documents 2H + shield conflict is blocked in UI before submit

### 047.11 Equipment selection back navigation

#### Description
Add a **Back** control on the equipment selection page that returns the player to character setup without applying a loadout or advancing guided-creation phase.

#### Acceptance Criteria
- [x] Back button visible on equipment selection (loading, error, and main form states)
- [x] Back navigates onboarding stage to `characterSetup`
- [x] Renderer test verifies Back invokes `onBack`
- [x] `npm test`, `npm run lint`, and `npm run build` pass

### 047.12 Preserve character setup when returning from equipment

#### Description
Returning from equipment selection to character setup should restore the previously entered character details and party members from the persisted equipment-phase player instead of showing a blank form or creating duplicate characters on resubmit.

#### Acceptance Criteria
- [x] Character setup hydrates from the equipment-phase player in campaign detail
- [x] Resubmit updates the existing player and replaces setup party members
- [x] Back from equipment refreshes campaign detail before showing character setup
- [x] Unit tests cover draft hydration and setup update IPC
