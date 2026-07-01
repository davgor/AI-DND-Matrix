# EPIC: Quest log — main story and side quests tied to the campaign hook

Players have no structured way to track what they're trying to accomplish. Today quest-related data is **fragmented**:

| Artifact | What it is | Gap |
|----------|------------|-----|
| **`story_threads`** | One campaign-level narrative arc from generation; DM updates via `storyThreadUpdate` | Not a player-facing quest log; completion inferred from free-text `state` strings |
| **`world_facts` (`quest_hook`)** | Region `potentialQuests` from generation — one-sentence hooks | Shown on review/hub as "Potential quests"; never promoted to trackable quests |
| **`campaigns.premise_prompt`** | Initial player hook | Not linked to any in-play objective UI |
| **Log book (025)** | Subjective knowledge (places, people, events) | Not objectives or progress |
| **Journal (027)** | Personal narrative notes | Not structured quest tracking |
| **XP/loot `quest_complete`** | Fires when `story_threads.state` → `completed`/`resolved`/`done` | Coupled to story-thread state heuristics (`questLootContext.ts`), not a quest model |

This epic introduces a **per-character quest log** with two quest kinds:

- **Main story** — seeded from the campaign premise + generated `story_thread`; always traceable back to the initial hook
- **Side quests** — promoted from region quest hooks, DM narration, or manual curation; optional link to region/NPC/`world_fact`

Quest completion feeds the existing **035/036** reward pipeline (`runQuestXpPass`, quest loot) via a proper quest id instead of inferring completion from story-thread state strings alone.

Builds on **007** (campaign generation + quest hooks), **025** (log book — keep separate), **027** (journal — keep separate), **035–036** (quest XP/loot), **038** (hub + multi-character), **043** (play chrome / rail shortcuts), **044** (sheet overlay modal pattern — Quest Log opens alongside Inventory / Log Book / Journal).

Broken down into sub-tickets **045.1–045.13**. This epic is done when all are complete and `npm test`, `npm run lint`, and `npm run build` pass.

## Target model

```
Campaign premise (hook)
        │
        ▼
┌───────────────────┐     story_thread row (generation)
│  MAIN STORY quest │ ◄──────────────────────────────────
│  type: main       │
│  status: active…  │
│  hookLine: premise│
│  objectives[]     │
└───────────────────┘

Region quest_hook world_facts / DM proposals
        │
        ▼
┌───────────────────┐
│  SIDE QUEST(s)    │
│  type: side       │
│  status: available│
│  regionId / npcId │
│  objectives[]     │
└───────────────────┘

Per character: character_quests (status, accepted/completed dates, notes)
```

**Distinction contract:**

| System | Purpose |
|--------|---------|
| **Quest log** | Actionable objectives with status — *what am I trying to do?* |
| **Log book** | Established knowledge — *what do I know?* |
| **Journal** | Personal reflection — *how did that feel?* |
| **Story thread** | DM/world narrative arc state — kept for agent grounding; main quest **mirrors** it but is player-facing |

## Definition of done

- `src/shared/quests/SPEC.md` documents quest types, statuses, premise linkage, and boundaries vs log book/journal/story threads
- `quests` + `character_quests` tables with forward migration
- Main story quest auto-seeded per player character at campaign start (premise + `story_thread` link)
- Region `quest_hook` facts can be promoted to **available** side quests
- Engine-owned status transitions; completion triggers existing quest XP/loot passes by `questId`
- DM agent can propose quests, update objectives, and mark completion via narration schema
- Active quests injected into `assembleNarrationContext` for grounding
- **Quest log modal**: Main Story section + Side Quests section with status badges and objective checklist
- Entry points from play chrome (043), sheet overlay (044), and hub teaser (038)
- DM curate UI for manual add/edit/complete/abandon
- Smoke: main quest visible after campaign start → accept side quest from hook → complete → XP/loot fires

045.1 quest log spec · 045.2 DB schema + repositories · 045.3 seed main quest + import side quest hooks · 045.4 engine quest state machine · 045.5 wire completion to XP/loot pipeline · 045.6 DM agent quest proposal schema · 045.7 narration context grounding · 045.8 quest log IPC · 045.9 quest log modal UI · 045.10 play/hub entry points · 045.11 DM curate UI · 045.12 side quest discovery + promotion flow · 045.13 tests + smoke runbook

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **043** | Quest log button in session chrome or play-rail tab; optional compact "active quest" chip in chrome |
| **044** | Sheet overlay action button **Quest Log** (peer to Inventory / Log Book / Journal) |
| **038** | Hub world preview shows main story quest summary + count of active side quests |
| **025** | Log book `event` entries may reference a quest id via `relatedEntityId`; quests do not duplicate log book prose |
| **040** | Active-quest context windowing in narration prompts (bounded slice, not full history) |

## Out of scope

- Quest map / waypoint UI / travel routing changes
- Multi-step branching quest trees with mutually exclusive paths (v1: linear objectives list)
- Player-authored quest creation (DM-curated + agent-proposed only)
- Replacing `story_threads` table entirely (kept for DM agent; main quest syncs from it)
- Shared party quest roster / quest giver NPC scheduling

## Open decisions (resolve in 045.1)

- **Main quest auto-accept:** `active` on character creation vs `available` until first play turn
- **Cross-character visibility:** side quest accepted by Character A visible to Character B in hub only, or hidden until discovered
- **Objective granularity:** free-text bullet list vs structured `{ id, text, done }` checklist

## Sub-tickets

### 045.1 Quest log spec + type contract

#### Description

Author `src/shared/quests/SPEC.md` defining the quest log system.

Document:

- **`QuestKind`**: `main` | `side`
- **`QuestStatus`** (per character): `available` | `active` | `completed` | `failed` | `abandoned`
- **`Quest` record**: `id`, `campaignId`, `kind`, `title`, `summary`, `hookLine` (premise excerpt for main), `storyThreadId?`, `premiseAnchor?`, `regionId?`, `sourceWorldFactId?`, `scale` (`minor` | `major`), `objectives[]`
- **`CharacterQuest` record**: `characterId`, `questId`, `status`, `acceptedInGameDate?`, `completedInGameDate?`, `playerNotes?`
- **Premise linkage**: main quest `hookLine` derived from `campaigns.premise_prompt`; `storyThreadId` links to generation arc; DM `storyThreadUpdate` syncs summary/objectives on main quest
- **Promotion**: `world_facts` with `faction_tag = 'quest_hook'` → side quest candidate (`available`)
- **vs log book**: quest completion may emit log book `event` entry; quest log does not store encyclopedic knowledge
- **vs journal**: journal remains first-person; quest log is third-person objective tracking
- **Completion → rewards**: `questId` + `scale` replace `questThreadId` in `LootContext` / XP context assembly
- Resolve open decisions above

#### Acceptance Criteria

- [ ] Spec checked in with worked examples: premise → main quest, region hook → side quest, completion → XP
- [ ] Explicit sync rules between `story_threads` and main quest documented
- [ ] Windowing constant for active quests in narration context defined

---

### 045.2 DB schema + repositories

#### Description

Add tables via numbered migration in `schema.ts`:

**`quests`**
- `id`, `campaign_id`, `kind` (`main`|`side`), `title`, `summary`, `hook_line`, `story_thread_id` (nullable FK), `region_id` (nullable), `source_world_fact_id` (nullable), `scale` (`minor`|`major`), `objectives_json` (JSON array), `created_at`

**`character_quests`**
- `character_id`, `quest_id`, `status`, `accepted_in_game_date`, `completed_in_game_date`, `player_notes`, `updated_at`
- `PRIMARY KEY (character_id, quest_id)`

Repository functions:
- `createQuest`, `listQuestsByCampaign`, `getQuestById`
- `upsertCharacterQuest`, `listCharacterQuests`, `listActiveQuestsForCharacter`
- `promoteWorldFactToQuest` (side quest from quest_hook fact)

#### Acceptance Criteria

- [ ] Migration applies forward-only on existing saves
- [ ] Character isolation: `listCharacterQuests` never leaks another character's status
- [ ] Unit tests: create, list, status upsert, campaign/character isolation
- [ ] CHECK constraints on `kind`, `status`, `scale`

---

### 045.3 Seed main quest + import side quest hooks

#### Description

**Main quest seeding** (campaign generation + migration backfill):

- On `persistCampaignGeneration` / new campaign: create one `main` quest from `storyThread` title/summary + `premisePrompt` as `hookLine`; link `story_thread_id`
- For each player character at guided-creation complete (or first hub entry): create `character_quests` row — status per 045.1 decision (default: `active` for main)
- Migration: existing campaigns with `story_threads` + `premise_prompt` get a main quest backfilled per existing player character

**Side quest import**:

- Region `quest_hook` world facts → `available` side quests (one quest per hook, `source_world_fact_id` set, `region_id` linked)
- Per character: `character_quests` row with `available` (not auto-active)
- Idempotent: re-run does not duplicate quests for same `source_world_fact_id`

#### Acceptance Criteria

- [ ] New campaign creates main quest + character quest rows for each player character
- [ ] Migration backfill tested on fixture DB with story thread and quest hooks
- [ ] Side quests created from generation hooks with correct region linkage
- [ ] `campaignGeneration` smoke still passes

---

### 045.4 Engine quest state machine

#### Description

Pure functions in `src/engine/quests.ts`:

- `canTransitionQuestStatus(from, to)` — valid transitions (e.g. `available`→`active`, `active`→`completed`|`failed`|`abandoned`)
- `validateObjectiveUpdate(objectives, completedIndex)` — checklist toggle
- `isQuestComplete(status)` — matches `LOOT_COMPLETED_STATES` semantics for reward trigger
- `inferQuestScale(quest)` — reuse/port logic from `inferQuestScale(thread)` in `questLootContext.ts`

#### Acceptance Criteria

- [ ] Unit tests for all valid/invalid transitions
- [ ] `isQuestComplete` aligned with `isLootCompletedState` for completion status
- [ ] Engine has no Electron/DB imports

---

### 045.5 Wire quest completion to XP/loot pipeline

#### Description

Extend reward pipeline to key off quest log completion:

- `assembleQuestLootContext` / `assembleQuestXpContext` accept `questId` from completed `character_quests` row
- On quest status → `completed`: trigger `runQuestXpPass` + quest loot pass (same as today's story-thread transition)
- **Backward compat**: `storyThreadUpdate` to terminal state still triggers rewards if main quest linked — or sync main quest status and dedupe (document in spec)
- Update `LootContext` / XP context types: `questId` field; deprecate `questThreadId` usage in new code paths
- Update `progression/SPEC.md` and `loot/SPEC.md`

#### Acceptance Criteria

- [ ] Completing side quest via engine transition fires XP + loot
- [ ] Completing main quest fires with `major` scale when appropriate
- [ ] No double reward if both story thread and quest log update on same turn (dedupe test)
- [ ] Existing `questLootContext.test.ts` patterns preserved or migrated

---

### 045.6 DM agent quest proposal schema

#### Description

Extend DM narration response in `dm.ts`:

```json
{
  "questProposals": [{
    "kind": "side",
    "title": "string",
    "summary": "string",
    "scale": "minor"|"major",
    "regionId": "optional",
    "objectives": ["string"],
    "relatedWorldFactId": "optional"
  }],
  "questUpdates": [{
    "questId": "string",
    "objectiveIndex": 0,
    "objectiveDone": true,
    "summary": "optional refresh"
  }],
  "questCompletions": ["questId"]
}
```

Persist in `persistNarrationSideEffects`:

- Proposals create `quests` + `character_quests` (`active` for side if player clearly accepted in narration; else `available`)
- Updates toggle objectives / refresh summary on acting character's quest
- Completions set `completed` + in-game date; triggers 045.5 reward pass
- `storyThreadUpdate` on linked main quest syncs title/summary/objectives to main quest row

Prompt guidance: propose side quests when NPCs offer jobs; complete when narration resolves the objective; main story progress should advance the linked main quest.

#### Acceptance Criteria

- [ ] Valid proposal persists quest + character quest for acting player
- [ ] Invalid `questId` in update/completion dropped safely
- [ ] `storyThreadUpdate` syncs main quest without duplicate quest row
- [ ] Unit tests in `dmQuest.test.ts` (new)

---

### 045.7 Narration context grounding (active quests)

#### Description

Extend `assembleNarrationContext`:

- Include acting character's **active** quests (main + side): `id`, `kind`, `title`, `summary`, `objectives` with done flags, `hookLine` for main
- Window to `MAX_ACTIVE_QUESTS_IN_CONTEXT` (named constant, e.g. 3) — prioritize main + most recently accepted side quests
- Prompt instruction: narration should respect active objectives; do not contradict completed quest state

Mirror windowing pattern from `logBookWindow.ts` (045.1 constant).

#### Acceptance Criteria

- [ ] Context includes active quests only, not `available`/`abandoned`
- [ ] Bound respected in unit test with 5+ active quests fixture
- [ ] Empty quest list omits section without error
- [ ] `dm.test.ts` or dedicated test verifies prompt inclusion

---

### 045.8 Quest log IPC

#### Description

Typed IPC channels (preload-exposed):

| Channel | Purpose |
|---------|---------|
| `quests:listForCharacter` | All quests + character status for modal |
| `quests:accept` | `available` → `active` (player action) |
| `quests:abandon` | `active` → `abandoned` |
| `quests:updateNotes` | Player notes on character quest |
| `quests:create` / `quests:update` / `quests:delete` | DM curate (045.11) |

Return typed errors for invalid transitions (`invalid_transition`, `not_found`).

#### Acceptance Criteria

- [ ] All channels wired through main/preload with same security pattern as log book IPC
- [ ] Accept/abandon call engine validators from 045.4
- [ ] Integration test: list → accept → complete round-trip

---

### 045.9 Quest log modal UI

#### Description

New `QuestLogModal` — peer to `CharacterLogBookModal` / future `InventoryModal` (044):

**Layout:**
- Header: character name + "Quest Log"
- **Main Story** section (pinned top): hook line (premise excerpt), title, summary, objectives checklist (read-only or toggle if player can mark — default read-only, DM/agent marks done)
- **Side Quests** subsection: grouped by status (`Active`, `Available`, `Completed`)
- Quest card: title, summary, region name (if linked), scale badge, status pill, objective list
- **Accept** button on `available` side quests; **Abandon** on `active` (with confirm)
- Auto-refresh when modal open across turns (refresh token from play controller — same pattern as 044.13 log book)

CSS: `questLog.css` — distinct from log book (objective/checklist visual language)

#### Acceptance Criteria

- [ ] Main story quest always visible when seeded
- [ ] Side quests filterable by status tabs or sections
- [ ] Accept transitions to `active` via IPC
- [ ] Completed quests show completion in-game date
- [ ] UI test: render main + side fixtures; accept flow

---

### 045.10 Play, sheet, and hub entry points

#### Description

Wire quest log into shells defined by 043/044/038:

| Surface | Affordance |
|---------|------------|
| **Play session chrome (043.2)** | "Quests" button or active-quest chip showing main quest title (truncated) |
| **Sheet overlay (044.9)** | **Quest Log** action button opens `QuestLogModal` |
| **Play rail (043.8)** | Optional Quest tab stub → opens modal (if tab exists before 044, wire to modal) |
| **Campaign hub (038)** | `CampaignHubWorldPreview` or header: main story hook line + "N active side quests" link opening read-only quest summary (or full modal for selected character) |

Update 043/044 epic notes or cross-reference comments if those tickets are implemented first — stubs OK.

#### Acceptance Criteria

- [ ] Quest log reachable from play mode without devtools
- [ ] Hub shows main story connection to premise (hook line visible)
- [ ] Opening from hub uses selected/hovered character context
- [ ] No layout regression to hub or play shells

---

### 045.11 DM curate UI + manual quest controls

#### Description

DM-facing controls in `QuestLogModal` when **Curate** mode enabled (parallel 044.15 log book pattern):

- **Add quest** (side): title, summary, scale, region picker, objectives
- **Edit** title/summary/objectives on any quest
- **Force status** (complete, fail, abandon) on character quest
- **Link to world fact** — pick un promoted `quest_hook` and promote manually

Uses 045.8 DM IPC channels. Not player-facing in normal mode.

#### Acceptance Criteria

- [ ] Manual side quest create appears in acting character's log as `active`
- [ ] Edit updates persist and appear in next narration context
- [ ] Force complete triggers reward pass once
- [ ] Curate mode hidden behind toggle or dev setting per 045.1 decision

---

### 045.12 Side quest discovery + promotion flow

#### Description

Player-facing discovery without waiting for DM proposal:

- **Available** side quests from seeded `quest_hook` imports visible in quest log when character enters linked region (auto-surface `available` — no new row, just UI filter) OR when DM mentions the hook in narration (agent sets `available` → `active`)
- Region card on hub/review: "Quest available" badge when unaccepted side quest exists for region
- Optional player action in quest log: **Track quest** on `available` → `active`

Clarify in UI copy: main story is always tracked; side quests are opt-in.

#### Acceptance Criteria

- [ ] Seeded hook from region X appears in quest log when character's `currentRegionId` matches (or always visible as `available` — pick one, document)
- [ ] Accept/track flow tested end-to-end
- [ ] Hub region card shows quest available indicator when applicable
- [ ] No duplicate quest rows when DM also proposes same hook

---

### 045.13 Tests, smoke runbook, and cross-epic docs

#### Description

- `src/db/questLogSmoke.test.ts`: create campaign → main quest seeded → accept side quest → DM complete narration → XP/loot event → modal lists completed
- `docs/runbooks/quest-log-smoke-test.md` — manual: hub hook visible, play chrome open, accept, complete, rewards
- Update README roadmap for 045
- Cross-reference in 043.1 spec and 044.9 overlay button list (comment in those files optional — README sufficient)

#### Acceptance Criteria

- [ ] Automated smoke covers main seed + side accept + completion rewards
- [ ] Multi-character fixture: Character A accepts side quest; Character B does not see it as `active`
- [ ] Runbook manual steps documented
- [ ] `npm test`, `npm run lint`, `npm run build` pass with epic complete
