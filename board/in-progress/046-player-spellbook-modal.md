# EPIC: Player spellbook modal — known spells from catalog

Players who earn `spell_access` perks (epic **036**) get entries in `characters.stats.knownSpellKeys`, but there is **no player-facing UI** to read what they know. The preseeded **catalog** (`catalog_spells`, epic **023**) holds full spell metadata (name, effect type, range, turn cost, tags, archetype constraints), yet the renderer never joins known keys to catalog rows for display.

This mini epic adds a **Spellbook** modal — a read-only reference for spells the active character has learned — opened from the **Journal** tab on the play sheet rail (epic **043**). It follows the same modal pattern as **Quest Log** (045) and **Log Book** (044): viewport overlay via `ModalPortal`, refresh on turn/level-up.

Builds on **023** (catalog spells), **036** (level-up `spell_access` → `knownSpellKeys`), **027** (journal — separate concern), **043** (journal tab affordances), **045** (modal/IPC patterns).

Broken down into sub-tickets **046.1–046.8**. This epic is done when all are complete and `npm test`, `npm run lint`, and `npm run build` pass.

## Target UX

```
Journal tab (play rail)
  ├── Open journal      → existing journal overlay (027)
  ├── Open quest log    → QuestLogModal (045)
  └── Open spellbook    → SpellbookModal (new)

SpellbookModal
  ├── Header: "{Name}'s Spellbook"
  ├── Empty state: "No spells learned yet."
  └── Spell cards (known only):
        Name · effect type · range · turn cost
        Tags + short rules text synthesized from catalog fields
```

## Distinction contract

| System | Purpose |
|--------|---------|
| **Spellbook** | Known castable abilities — *what can I use in play?* |
| **Journal** | Personal narrative diary — *what happened to me?* |
| **Log book** | World knowledge — *what do I know about the world?* |
| **Quest log** | Objectives — *what am I trying to do?* |
| **Catalog** | Full content library (engine/DM) — not player-facing wholesale |

Spells are **not** removed from `knownSpellKeys` when forgotten in narration unless a future epic adds that — v1 is append-only via engine-validated grants.

## Data model (v1)

- **Source of truth:** `characters.stats.knownSpellKeys: string[]` (catalog spell `key` values)
- **Resolution:** join each key → `catalog_spells` row via `getSpellByKey`; drop unknown keys safely (log in dev, omit in UI)
- **No new table** for v1 — keys in stats JSON suffice
- **Grant paths (v1):**
  - Existing: level-up `spell_access` perk (`perkCategoryAppliers.ts`)
  - New: optional DM narration `spellGrants?: { catalogSpellKey: string }[]` (046.6) — engine validates key exists before append

Display fields per known spell:

| Field | Source |
|-------|--------|
| Name | `catalog_spells.name` |
| Effect | `effect_type` (damage, heal, control, …) |
| Range | `range` |
| Turn cost | `cost` (turns locked out after cast — see README rules) |
| Tags | `tags[]` |
| Requirements | `constraints` (archetype, min level) — shown as read-only hint |

## Definition of done

- `src/shared/spells/SPEC.md` documents spellbook boundaries, grant paths, and display contract
- Engine/shared resolver: `resolveKnownSpells(keys, catalogLookup)` with tests
- IPC: `spellbook:listForCharacter` returns resolved known spells for modal
- `SpellbookModal` + `spellbook.css` — peer to `QuestLogModal`, uses `ModalPortal`
- **Journal tab** gains **Open spellbook** button; wired through `PlaySheetModals`
- DM narration can grant validated catalog spells (046.6); optional context window for active known spells (046.7)
- Smoke runbook + automated test for level-up spell → spellbook lists spell

046.1 spellbook spec · 046.2 known-spell resolver + shared types · 046.3 spellbook IPC · 046.4 SpellbookModal UI · 046.5 journal tab entry point · 046.6 DM narration spell grants · 046.7 narration context grounding · 046.8 tests + smoke runbook

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **043** | Entry point on Journal tab only (v1); no session-chrome chip |
| **045** | Reuse `ModalPortal`, modal overlay CSS, play-sheet action button pattern |
| **036** | `spell_access` populates `knownSpellKeys` — primary seed for smoke test |
| **023** | Catalog spell rows are display source |
| **027** | Journal modal stays separate; spellbook is sibling button on same tab |

## Out of scope

- Casting spells from the spellbook UI (player still types actions in composer)
- Spell slots, mana, or preparation/rest memorization mechanics
- Showing unknown/catalog spells grayed out (“spell library” view)
- Per-spell player notes or favorites
- NPC or party-member spellbooks in v1 (player character only)

## Open decisions (resolve in 046.1)

- **Sort order:** alphabetical by name vs ascending turn cost vs group by effect type
- **DM grants:** narration `spellGrants` in v1, or level-up-only until a follow-up epic
- **Context window:** include known spell names in DM prompt by default, or defer to 046.7

## Sub-tickets

### 046.1 Spellbook spec + type contract

#### Description

Author `src/shared/spells/SPEC.md` defining the player spellbook system.

Document:

- `KnownSpellView`: resolved catalog row + `catalogKey` for debugging
- Join rules: `knownSpellKeys` → `getSpellByKey`; invalid keys omitted
- Grant paths: level-up `spell_access`, DM `spellGrants` (if 046.6 in scope)
- vs journal / log book / quest log boundaries
- Modal entry: journal tab only (v1)
- Resolve open decisions above

#### Acceptance Criteria

- [ ] Spec checked in with worked example: level-up firebolt → spellbook card
- [ ] Explicit non-goals: casting UI, full catalog browser, new spell tables
- [ ] Turn-cost field documented as turns locked out (not mana)

---

### 046.2 Known-spell resolver + shared types

#### Description

Add `src/shared/spells/types.ts` and pure resolver in `src/engine/knownSpells.ts` (or `src/shared/spells/resolveKnownSpells.ts` if engine-free):

- `resolveKnownSpells(keys: string[], lookup: (key) => CatalogSpell | undefined): KnownSpellView[]`
- Dedupe keys, preserve stable sort per spec
- Unit tests: valid keys, unknown key dropped, empty list, duplicate keys

#### Acceptance Criteria

- [ ] Resolver is pure (no Electron/DB imports in engine path)
- [ ] Tests cover invalid/duplicate/empty fixtures
- [ ] `KnownSpellView` exported for renderer and IPC

---

### 046.3 Spellbook IPC

#### Description

Typed IPC channel:

| Channel | Purpose |
|---------|---------|
| `spellbook:listForCharacter` | Resolve `knownSpellKeys` from character stats + catalog; return `KnownSpellView[]` |

Wire through main/preload matching log book / quest log security pattern.

#### Acceptance Criteria

- [ ] Channel returns only spells for requested `characterId`
- [ ] Character isolation enforced (cannot read another character's list)
- [ ] Integration test: character with `knownSpellKeys` → list returns catalog metadata

---

### 046.4 SpellbookModal UI

#### Description

New `SpellbookModal` — peer to `QuestLogModal`:

- Header: `"{characterName}'s Spellbook"`
- Scrollable spell cards: name, effect, range, turn cost, tags
- Constraints line when present (e.g. “Mage · level 3+”)
- Empty state copy
- `spellbook.css` — distinct from quest log (effect/cost visual language)
- Uses `ModalPortal` + `.modal-overlay` (viewport centered, not clipped by side pane)

#### Acceptance Criteria

- [ ] Modal dismisses via backdrop, Escape, close button
- [ ] Long spell lists scroll inside modal
- [ ] UI test: render fixture with 2 known spells + empty state

---

### 046.5 Journal tab entry point

#### Description

Wire spellbook into play shell:

- Journal tab (`playSheetRailTabs.tsx`): add **Open spellbook** button alongside journal and quest log
- `PlaySheetModals`: `spellbookOpen` state + `SpellbookModal` with `refreshToken` from play controller (so level-up grants appear without reopening campaign)
- No entry on Character tab, sheet overlay, or session chrome (v1)

#### Acceptance Criteria

- [ ] Spellbook reachable from play mode Journal tab without devtools
- [ ] After level-up grants a spell, reopening spellbook shows new entry (refresh token)
- [ ] Journal and quest log buttons unchanged

---

### 046.6 DM narration spell grants (optional v1)

#### Description

Extend DM `NarrationResult` with optional `spellGrants?: { catalogSpellKey: string }[]`.

Persist in narration side effects:

- Validate key exists in `catalog_spells`
- Append to `stats.knownSpellKeys` if not already present (same dedupe as level-up)
- Invalid keys dropped safely

Prompt guidance: grant spells when training, finding grimoires, or story rewards — not every turn.

#### Acceptance Criteria

- [ ] Valid grant persists key on acting player character
- [ ] Invalid key does not corrupt stats
- [ ] Unit test in `dmSpellbook.test.ts` or extend `dm.test.ts`
- [ ] Skip ticket if 046.1 defers DM grants — document in spec instead

---

### 046.7 Narration context grounding (optional v1)

#### Description

Include acting character's known spell **names** (and turn costs) in `assembleNarrationContext` — bounded slice, e.g. `MAX_KNOWN_SPELLS_IN_CONTEXT = 8`, alphabetical.

Prompt note: player may reference these spells in free-text actions; engine still resolves outcomes.

#### Acceptance Criteria

- [ ] Context lists known spells only when `knownSpellKeys` non-empty
- [ ] Bound respected in unit test with 10+ keys fixture
- [ ] Skip if deferred — spec documents follow-up

---

### 046.8 Tests, smoke runbook, README touch-up

#### Description

- `src/db/spellbookSmoke.test.ts` or renderer smoke: level-up spell_access → open spellbook IPC → spell listed
- `docs/runbooks/spellbook-smoke-test.md` — manual: journal tab → open spellbook → verify firebolt after mage perk
- README roadmap line for 046 when promoted to in-progress

#### Acceptance Criteria

- [ ] Automated test covers resolver + IPC round-trip
- [ ] Runbook manual steps documented
- [ ] `npm test`, `npm run lint`, `npm run build` pass with epic complete
