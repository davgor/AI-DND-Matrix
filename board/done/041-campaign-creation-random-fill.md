# EPIC: Campaign creation random fill (fast manual testing)

Add per-field **🎲** controls on campaign-creation forms that fill individual inputs with randomized but **validation-safe** values — so manual smoke and provider testing does not require retyping premise text, counts, and death-mode fields every run.

Scope is **renderer dev convenience only** — no LLM calls, no agent calls, no persistence side effects until the user still clicks Create/Generate.

**Non-agentic rule:** anything a player would normally type (campaign name, premise, respawn location, region/NPC seed prompts) must come from **static word/template pools** and deterministic combinatorics only — never `provider.generate()` or any agent path.

Builds on **017** (campaign start modal), **039** (region/NPC count fields), and the review-screen generate-region / generate-NPC dialogs.

Broken down into sub-tickets **041.1–041.5**. This epic is done when all are complete.

## Definition of done

- Shared pure **per-field** generators exist; each output passes validation when applied to its field
- Every eligible form field has its own dev-only **🎲** button beside the input (not one global “fill all” action)
- Player-facing text fields use non-agentic pool/template randomization only
- Review generate modals follow the same per-field 🎲 pattern
- Generator + UI wiring are unit-tested; packaged production builds hide 🎲 controls

041.1 per-field random generators (non-agentic) · 041.2 shared 🎲 field button component · 041.3 campaign start modal per-field wiring · 041.4 review generate modals per-field wiring · 041.5 tests + dev smoke note

## UI pattern

```
[ Campaign name input                    ] [🎲]
[ Premise textarea                       ] [🎲]
Death mode  [🎲]   ○ Legendary  ○ Standard  ○ Respawn
[ Regions to generate  ] [🎲]
[ NPCs per region      ] [🎲]
```

- **🎲** = icon-only button, `aria-label` describes which field it fills (e.g. “Random campaign name”)
- Visible when `import.meta.env.DEV` is true only
- Disabled while `submitting` / `generating`
- Fills **that field only** via `flow.updateForm({ field: value })` (or equivalent setter)
- Does not auto-submit

## Sub-tickets

### 041.1 Per-field random generators (non-agentic)

#### Description

Pure module under `src/shared/campaignCreate/` exporting **one function per field** (not only a monolithic fill-all helper). No React, Electron, or agent imports. Accept optional `RandomSource` / seed for deterministic tests.

**Player-facing text — static pools + templates only (no LLM):**

| Export | Field | Rule |
|--------|-------|------|
| `randomCampaignName()` | `name` | Adjective+noun or epithet+place from fixed word lists (e.g. “Crimson Vale”, “The Shattered Crown”) |
| `randomPremisePrompt()` | `premisePrompt` | Sentence templates with slot picks from curated genre/setting/hook pools (10+ base templates) |
| `randomRespawnLocation()` | `respawnLocation` | Place-name pool (inn, shrine, district, landmark) |
| `randomRegionSeedPrompt()` | review region seed | One-line hook from place/mood/conflict pools |
| `randomNpcSeedPrompt(regionName)` | review NPC seed | Template inserting `regionName` + role/mood pool picks |

**Mechanical fields — bounded random:**

| Export | Field | Rule |
|--------|-------|------|
| `randomDeathMode()` | `deathMode` | Uniform among `legendary` / `standard` / `respawn` |
| `randomRegionCount()` | `regionCount` | Integer in `MIN_REGION_COUNT`–`MAX_REGION_COUNT` |
| `randomNpcsPerRegion()` | `npcsPerRegion` | Integer in `MIN_NPCS_PER_REGION`–`MAX_NPCS_PER_REGION` |
| `randomRespawnCost()` | `respawnCost` | Integer 0–500 (for when respawn UI gains cost field, or form state either way) |
| `randomRespawnLimit()` | `respawnLimit` | `''` or 1–5 |
| `randomAdditionalRegionNpcCount()` | review NPC count | Integer in additional-region bounds |

Optional convenience: `randomCampaignSetupForm()` composing all fields (for tests only — **not** exposed as a single UI button).

Run count outputs through `clampRegionCount` / `clampNpcsPerRegion` / `normalizeFormValues` as appropriate.

#### Acceptance Criteria

- [ ] Each per-field export is independently callable and documented
- [ ] Applying all campaign-start field generators to a default form yields `validateCampaignSetupForm(form) === null`
- [ ] Text generators use only static in-repo pools — grep confirms no `provider`, `generate(`, or agent imports in the module
- [ ] Region/NPC counts respect shared min/max constants from `types.ts`
- [ ] Seeded `RandomSource` produces repeatable output in unit tests

---

### 041.2 Shared 🎲 field button component

#### Description

Reusable renderer component (e.g. `FieldRandomDiceButton`) used beside every random-fillable input:

- Renders **🎲** as the visible label (icon-only button)
- Returns `null` when not `import.meta.env.DEV`
- Props: `onRandomize`, `disabled`, `ariaLabel` (required — names the target field)
- Shared CSS: compact square button aligned to input/textarea row (`field-with-random-input-row`)

#### Acceptance Criteria

- [ ] Component renders 🎲 with accessible `aria-label`; no visible “Fill random” text required
- [ ] Hidden in production build
- [ ] Disabled state respected
- [ ] Styles work for single-line input and multi-line textarea alignment

---

### 041.3 Campaign start modal per-field wiring

#### Description

Wire 041.1 + 041.2 into `CampaignStartFormFields` — **one 🎲 per field**:

| Field | 🎲 action |
|-------|-----------|
| Campaign name | `randomCampaignName()` |
| Premise | `randomPremisePrompt()` |
| Death mode | `randomDeathMode()` (may switch visible respawn field) |
| Regions to generate | `randomRegionCount()` |
| NPCs per region | `randomNpcsPerRegion()` |
| Respawn location (when visible) | `randomRespawnLocation()` |

Use `flow.updateForm({ … })` per click. No footer-level fill-all button.

#### Acceptance Criteria

- [ ] Dev build shows 🎲 beside each listed field; production build shows none
- [ ] Each 🎲 updates only its field; premise 🎲 does not change death mode, etc.
- [ ] After filling premise (and respawn location when mode is respawn), form passes client validation
- [ ] 🎲 clicks do not submit or change modal `view`
- [ ] Component test: premise 🎲 → non-empty premise; count 🎲 → in bounds

---

### 041.4 Review generate modals per-field wiring

#### Description

Same per-field 🎲 pattern on review dialogs:

**`GenerateRegionDialog`**

| Field | 🎲 action |
|-------|-----------|
| Seed textarea | `randomRegionSeedPrompt()` |
| NPC count | `randomAdditionalRegionNpcCount()` |

**`GenerateNpcDialog`**

| Field | 🎲 action |
|-------|-----------|
| Seed textarea | `randomNpcSeedPrompt(regionName)` |

#### Acceptance Criteria

- [ ] Dev-only 🎲 beside seed and (region dialog) NPC count
- [ ] Each 🎲 fills only its field; seed 🎲 leaves NPC count unchanged
- [ ] Region seed 🎲 enables submit when previously empty
- [ ] Hidden in production build
- [ ] Component or hook test per dialog

---

### 041.5 Tests + dev smoke note

#### Description

- Unit tests for 041.1: per-field validity, bounds, non-agentic pools, seeded repeatability
- Renderer tests for 041.2–041.4: 🎲 visibility (dev gate), per-field isolation, aria-labels
- One line in `docs/runbooks/startup-smoke-test.md`: use per-field 🎲 on new campaign for faster provider smokes

#### Acceptance Criteria

- [ ] `npm test` covers generator validity (≥5 cases including respawn branch + edge counts)
- [ ] Tests assert text generators do not call agents
- [ ] UI tests cover per-field 🎲 wiring on campaign start + at least one review dialog
- [ ] Documented flow: open new campaign → 🎲 on premise → Create campaign
