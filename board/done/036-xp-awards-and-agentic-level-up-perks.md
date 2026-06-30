# EPIC: XP awards and agentic level-up perks

Wire progression into encounter and quest completion — the mirror of epic **035** for loot. Today `awardXP` exists in `/engine/xp.ts` and characters persist `xp` / `level`, but **nothing awards XP** when combat ends or a quest completes. Level-ups have no UI, no narration beat, and no perk selection.

After this epic:

1. **XP awards** — at encounter end and quest completion, an agent proposes an XP amount grounded in what happened. The **engine** clamps the proposal to a band derived from encounter difficulty (foe tiers, count, outcome) and the player's **current level**, then calls `awardXP`.
2. **Level-up flow** — when a threshold is crossed, pause play for a level-up ceremony: DM narration + **three perk options** generated from what the character actually did since the last level (events, log book, journal, combat vs study tags).
3. **Perk application** — the player **chooses one** of the three options. The agent supplies flavor and a perk **category**; the engine applies mechanical numbers (AC +1, spell catalog grant, extra attack flag, etc.) via fixed templates — same guardrail pattern as 024.3 / 004.23 / homebrew flavor.

Examples the spec must support:
- Level 1 fighter who spent the level studying spells at a library → perk options lean arcane (catalog spell access, arcane-tagged ability)
- Level 1 fighter who leveled through combat → perk options lean martial (AC bump, extra attack, weapon proficiency flavor)

Builds on **035** hook points (same encounter-end / quest-complete triggers). Run **XP award before loot** in orchestration (document in 036.8). Integrates **004.22** emergent-direction signals into level-span activity context.

Broken down into sub-tickets 036.1–036.12. This epic is done when all of them are.

Definition of done:
- shared types document XP sources, clamp bands, perk categories, and level-up ceremony flow
- engine computes min/max XP from difficulty + player level; agent cannot exceed band
- encounter end and quest completion each trigger XP resolution
- crossing a level threshold opens level-up UI with narration and exactly 3 perk proposals
- perk proposals reflect level-span activity; player selects 1; engine persists mechanical effect
- multiple thresholds in one award queue sequential level-up picks (one ceremony per level gained)
- smoke test: encounter XP → combat-themed perks; quest XP → level-up; library-tagged activity → spell-leaning perk option

036.1 XP + level-up spec + shared types · 036.2 engine XP budget resolver (difficulty × player level) · 036.3 XP context assembly (encounter + quest) · 036.4 XP award agent + schema · 036.5 level-span activity context for perks · 036.6 engine perk templates + mechanical application · 036.7 level-up perk agent (3 options) + schema · 036.8 orchestration hooks (XP → level-up → loot order) · 036.9 perk persistence + character sheet display · 036.10 level-up modal UI (narration + pick 1 of 3) · 036.11 XP/level-up events + narration feed · 036.12 end-to-end progression smoke test

## Sub-tickets

### 036.1 XP + level-up spec + shared types

#### Description
Document progression awards and level-up ceremonies. Add shared types under `/shared`.

Cover:
- **`XPSource`**: `encounter_end` | `quest_complete` (align with 035 loot sources)
- **`XPContext`**: source, foe summaries / quest scale, player level, region, outcome severity
- **`XPBudget`**: `{ min, max, suggested }` from engine — agent proposes integer in range
- **`LevelSpanContext`**: events since `lastLevelAtXp` (or last level-up event), log book entries, journal entries, tagged activity counts (`combat`, `arcane`, `social`, `exploration`, …), `detectEmergentDirection` result, archetype
- **`PerkCategory`** enum (engine-owned): e.g. `ac_bonus`, `extra_attack`, `spell_access`, `hp_max_bonus`, `check_proficiency`, `passive_feature` (uses 004.23 template), `custom_feature` (homebrew path)
- **`PerkProposal`**: `{ id, name, description, category, flavorTags[], catalogSpellKey? }` — no numeric stats from agent
- **level-up ceremony**: on `leveledUp`, offer **exactly 3** `PerkProposal`s; player **selects 1**; play blocked until chosen (defer entry like guided creation gate)
- **multi-level awards**: queue one ceremony per level gained (level 1→3 from big quest = two sequential picks with activity partitioned or full span for each — document: use activity since previous threshold for each ceremony)
- **perk examples** in spec tied to activity (library arcane study vs combat fighter)
- integration with existing `LEVEL_XP_THRESHOLDS` / `awardXP`

#### Acceptance Criteria
- [x] Spec documents XP clamp authority and perk pick-1-of-3 flow
- [x] Shared types export `XPContext`, `XPBudget`, `LevelSpanContext`, `PerkProposal`, `AppliedPerk`
- [x] Spec lists each `PerkCategory` and what the engine applies mechanically
- [x] Unit tests validate perk proposal and XP proposal JSON guards

### 036.2 Engine XP budget resolver (difficulty × player level)

#### Description
Pure `/engine` function: `resolveXPBudget(context: XPContext): XPBudget`.

Deterministic rules (table in 036.1), e.g.:
- base XP from foe `combat_tier` + catalog level + count slain (not fled)
- quest complete: `minor` / `major` scale from 035 quest heuristics
- **level scaling**: divide or cap relative to player level so level 10 doesn't earn level-1 wolf XP — use `playerLevel` in denominator or tiered bands
- empty/trivial encounter (all fled, zero slain) → `{ min: 0, max: 0 }`
- engine `suggested` = midpoint of band for agent default

No LLM imports. Agent proposal clamped: `clampXPProposal(amount, budget)`.

#### Acceptance Criteria
- [x] Wolf pack at player level 1 yields non-zero band; same encounter at level 10 yields lower relative band (or zero if trivial)
- [x] Major quest complete band exceeds routine bandit skirmish
- [x] Zero band when nothing earned
- [x] Unit tests cover encounter, quest, level scaling, and clamp helper

### 036.3 XP context assembly (encounter + quest)

#### Description
Assemble `XPContext` at the same trigger points as loot (035.4 / 035.5):

**Encounter end:** slain/surrendered foes (034 outcomes), catalog tier, bucket, encounter duration/round count if available, player level.

**Quest complete:** story thread transition to completed, quest scale (`minor`/`major`), player level.

Skip XP pass when `XPBudget.max === 0`.

Reuse combat_ended / quest completion detection — do not duplicate event subscription logic from 035; share a `PostResolutionContext` builder if practical (document in 036.8).

#### Acceptance Criteria
- [x] Encounter context includes foe difficulty signals used by 036.2
- [x] Quest context includes scale from 035.5 heuristics
- [x] All-fled zero-slain encounter skips XP assembly
- [x] Unit tests mirror 035.4/035.5 fixtures with XP fields

### 036.4 XP award agent + schema

#### Description
Dedicated agent call after `XPContext` + `XPBudget` are ready.

**Prompt includes:** what happened (foes defeated, quest hook), player level, budget `{ min, max, suggested }`, instruction to justify amount narratively.

**Output schema:**
```json
{
  "narrationText": "short XP beat",
  "xpAmount": number
}
```

Rules:
- `xpAmount` clamped to budget before `awardXP`
- persist updated `xp` and `level` on character via repository
- append `xp_awarded` event with source, amount, clamped flag
- return `{ leveledUp, levelsGained, newLevel }` for orchestration

#### Acceptance Criteria
- [x] Agent amount above `max` is clamped, not rejected
- [x] `awardXP` updates character row; `leveledUp` propagates
- [x] Scripted test: quest complete awards XP in band
- [x] Zero budget skips agent call

### 036.5 Level-span activity context for perks

#### Description
When `leveledUp` is true, build `LevelSpanContext` for the perk agent.

Collect since last level-up (track `stats.lastLevelUpXp` or `lastLevelUpAt` event):
- campaign `events` for character (player_action, combat_attack, check tags)
- character journal entries (027) in span
- log book entries (025) in span
- emergent direction via `detectEmergentDirection` on tagged events
- archetype / class from character row
- optional: equipped gear, recent loot (035)

Tag aggregation for prompt: counts of `combat`, `arcane`, `social`, `exploration` — derive tags from event payloads or DM intent metadata where available; document tag source in 036.1.

For multi-level gain: partition events by XP thresholds crossed or run one span for the highest new level only (pick one rule in 036.1 and test it).

#### Acceptance Criteria
- [x] Library/arcane-heavy fixture produces high arcane tag counts in context
- [x] Combat-heavy fixture produces high combat tag counts
- [x] Context excludes events before previous level threshold
- [x] Unit tests with seeded events + journal entries

### 036.6 Engine perk templates + mechanical application

#### Description
Extend `/engine` with perk application — agents pick `PerkCategory` + flavor only.

Templates (deterministic, unit-tested):
- **`ac_bonus`**: +1 AC (stack cap e.g. 3 from perks)
- **`extra_attack`**: set `stats.hasExtraAttack` flag for combat resolution (031+)
- **`spell_access`**: validate `catalogSpellKey` against catalog; grant known-spell id list on character stats
- **`hp_max_bonus`**: +2 max HP per application (scale with level if needed)
- **`check_proficiency`**: add proficiency tag for an ability (`body`|`agility`|`mind`|`presence`)
- **`passive_feature` / `custom_feature`**: `computeFeatureFromTemplate` + homebrew flavor (004.23)

`applyPerk(character, proposal): AppliedPerk` mutates stats JSON and returns mechanical summary for UI.

Reject unknown categories; reject spell keys not in catalog.

#### Acceptance Criteria
- [x] Each category has unit tests for deterministic mechanical output
- [x] Agent-supplied numbers in proposal are ignored
- [x] `spell_access` fails closed on invalid catalog key
- [x] `extra_attack` and `ac_bonus` persist in stats and affect combat/AC reads

### 036.7 Level-up perk agent (3 options) + schema

#### Description
Agent call when a level-up ceremony starts. Input: `LevelSpanContext`, new level, archetype, alignment.

**Output schema:**
```json
{
  "narrationText": "level-up narrative tying growth to what they did",
  "perks": [
    { "id": "a", "name": "...", "description": "...", "category": "...", "flavorTags": ["arcane"], "catalogSpellKey": "optional" },
    { "id": "b", ... },
    { "id": "c", ... }
  ]
}
```

**Prompt rules:**
- exactly **3** perks, distinct categories or distinct build directions
- tailor to activity: heavy `arcane` tags → include `spell_access` option; heavy `combat` → `extra_attack` or `ac_bonus`; social → `check_proficiency` presence/mind
- fighter + library study example must be achievable in tests
- no mechanical numbers in output
- categories must be from `PerkCategory` enum
- validate; retry up to `MAX_SCHEMA_ATTEMPTS`

#### Acceptance Criteria
- [x] Schema rejects !== 3 perks
- [x] Combat-span fixture yields at least one martial category option
- [x] Arcane-span fixture yields `spell_access` or arcane-tagged feature option
- [x] Narration references activity themes without inventing events not in context

### 036.8 Orchestration hooks (XP → level-up → loot order)

#### Description
Wire into post-resolution flow (shared with 035.8):

**Order per encounter/quest beat:**
1. XP context → budget → XP agent → persist XP
2. If `leveledUp`, queue level-up ceremony(ies) — **block further turns** until perk picked (036.10)
3. Loot pass (035) — loot narration follows XP/level-up beats in exposition ordering

Encounter end and quest complete both run XP; dedupe if both fire same turn (award once per source, or merge — document rule).

Expose IPC: `getPendingLevelUp(characterId)`, `submitPerkChoice(characterId, perkId)`.

Hook stub in 035.8 updated to call 036 pipeline before loot.

#### Acceptance Criteria
- [x] Encounter end awards XP without manual mid-turn narration grants
- [x] Quest completion awards XP on thread completed transition
- [x] Level-up blocks `resolvePlayerTurn` until perk submitted
- [x] Multi-level award queues two pick flows in tests
- [x] Loot runs after XP in integration test

### 036.9 Perk persistence + character sheet display

#### Description
Persist applied perks on character:
- `stats.perks: AppliedPerk[]` with level gained, category, name, mechanical summary
- update `stats.lastLevelUpXp` on each level-up completion

Character sheet (024.10 area): new **Perks** section listing name, description, mechanical tooltip (AC +1, knows spell X, extra attack).

IPC: list perks on character fetch used by sheet.

#### Acceptance Criteria
- [x] Selected perk persists across restart
- [x] Sheet shows perks with readable mechanical summary
- [x] Rejected unchosen perks are not persisted
- [x] `lastLevelUpXp` advances for next span calculation

### 036.10 Level-up modal UI (narration + pick 1 of 3)

#### Description
Modal or full-screen gate (pattern: guided creation / campaign start loading):

- DM narration text from perk agent
- three perk cards: name, description, category badge
- player must select one to continue
- on submit: `applyPerk` + close gate + refresh sheet

Accessible: keyboard selection, focus trap, clear confirm button.

Show new level number prominently.

#### Acceptance Criteria
- [x] Modal appears when `getPendingLevelUp` is non-null
- [x] Cannot dismiss without choosing a perk
- [x] Submit calls IPC and clears pending state
- [x] Second queued level-up shows after first pick when multi-level

### 036.11 XP / level-up events + narration feed

#### Description
Append events:
- `xp_awarded` — source, amount, clamped, new xp total
- `level_up` — old level, new level
- `perk_chosen` — perk id, category, level

Exposition feed: XP narration beat after encounter/quest; level-up narration in modal + optional summary line in feed after pick.

DM later-turn context includes recent perks and level for grounding.

#### Acceptance Criteria
- [x] Events queryable per campaign
- [x] XP beat visible in play view after encounter win
- [x] Perk choice event persisted with category
- [x] Unit test event payloads

### 036.12 End-to-end progression smoke test

#### Description
Validate XP → level-up → perk pick with scripted provider.

**Scenario A — combat encounter:**
- Win bandit fight → XP in budget → if threshold crossed, level-up with combat-themed perk options

**Scenario B — quest complete:**
- Complete minor quest → larger XP → level-up ceremony

**Scenario C — arcane activity span:**
- Seed events/journal with library/spell study before awarding enough XP to level
- Perk agent offers spell-leaning option among three; player picks `spell_access` → catalog spell on character

Deliver: `src/db/progressionSmoke.test.ts`, `docs/runbooks/progression-smoke-test.md`

#### Acceptance Criteria
- [x] Encounter awards XP and updates character row
- [x] Level-up presents 3 options; pick 1 persists perk
- [x] Arcane span scenario includes spell-access option in fixture
- [x] Engine clamps over-budget XP proposal
- [x] Runbook documents manual dev steps

