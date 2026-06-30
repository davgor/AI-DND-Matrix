# EPIC: Campaign hub, multi-character cast, and shared-world continuity

When a player selects a campaign that already has **at least one player character with `guided_creation_phase === 'complete'`**, stop jumping straight into `PlayView`. Instead, land on a **Campaign Hub**: a read-only, play-aware world preview in the center, a **character cast rail** on the right, and the existing campaign sidebar on the left. From here the player can review how the world has evolved, generate new regions, select a living character to resume play, view a dead character's obituary, or start the full new-character flow (mechanical setup → guided identity → opening scene).

This epic introduces **multiple fully playable player characters per campaign**, all inhabiting the **same live world at the same time** (unless a character is dead). World state — regions, NPCs, story threads, events, `current_state_summary` — remains **campaign-level**. Per-character state — `currentRegionId`, journal, log book, guided-creation fields, party roster, turn/narration history — is **character-scoped**. When the active player character encounters another **living but inactive** player character, the inactive one is **AI-driven** from their own history (narration log, journal, log book, identity summaries); interactions are **persisted to both characters' log books** so each protagonist retains context when their story is resumed later. AI party members can be **shared** across rosters; recruiting a hero from another character's party **transfers** that `ai_party_member` row to the recruiter's roster.

Campaigns still in onboarding (no player character, or guided creation incomplete) keep today's behavior — `CampaignReview` → `CharacterSetup` → guided creation — unchanged.

Onboarding `CampaignReview` stays **editable** for first-time setup. The hub is a **new screen** (`CampaignHub`) that reuses shared presentational components (region cards, story section, generate-region modal) in **read-only, play-aware** mode — do not bolt hub behavior onto the onboarding review as a dual-mode mess.

**Death & obituaries:** Persist durable death status on player characters (legendary permanent death, respawn limit exhausted, execute defeat under legendary, and **story-driven death** such as a valiant sacrifice — even under Standard mode where combat death normally reverts). Dead characters show a **skull and crossbones** before their name on the cast rail. Obituaries are **AI-generated at the moment of death** (modal: **"Drafting your obituary"**), grounded in how they died plus journal/log-book history and reactions from NPCs they had positive or negative history with. Obituary text is **persisted, not player-editable**. On the hub, viewing an obituary opens a **blocking modal** that must be dismissed before selecting or creating another character.

**Region generation:** Hub "Generate another region" reuses the additional-region pipeline but the agent must be grounded in **full campaign history** (existing regions + `region_history`, story-thread states/summaries, `current_state_summary`, recent world-altering events) — not just premise + region names. During play, when a player travels to a **destination that does not exist yet**, trigger the same generation path with a **loading modal** informing them the place is being created.

Builds on **007** (campaign generation), **009** (character creation + review), **025** (log book), **026** (guided creation), **011** (NPC/party promotion patterns), **010** (play loop / per-character `currentRegionId`).

Broken down into sub-tickets **038.1–038.19**. This epic is done when all of them are.

Definition of done:
- selecting a "ready" campaign opens `CampaignHub` instead of `PlayView`
- hub shows play-aware read-only world snapshot + cast rail with skull/obituary for dead characters
- player can resume any living character, create a new one (full guided flow), or generate a region from the hub
- multiple player characters coexist in one world; inactive living characters are AI-proxyable with cross-character log-book persistence
- party roster ownership + cross-roster recruitment transfer works
- death status + obituary generated at death; hub obituary modal blocks cast actions until dismissed
- mid-play travel to ungenerated areas triggers generation with player-facing loading UX
- end-to-end smoke test covers hub entry, second character creation, cross-character encounter, death/obituary, and travel-triggered region seeding

038.1 spec + shared types · 038.2 DB schema (death, obituary, party ownership) · 038.3 death status persistence + story-driven death hook · 038.4 obituary agent + generation pipeline · 038.5 death-time obituary drafting modal · 038.6 onboarding stage routing + hub gate · 038.7 hub IPC + play-aware world snapshot · 038.8 CampaignHub layout shell · 038.9 read-only play-aware world preview · 038.10 cast rail (select, skull, new character) · 038.11 hub obituary view modal (blocking) · 038.12 active character selection through play shell · 038.13 per-character party roster + cross-roster transfer · 038.14 inactive player-character AI proxy + encounter grounding · 038.15 cross-character interaction log-book writes · 038.16 campaign-history-aware region generation (hub) · 038.17 mid-play travel to ungenerated region + loading modal · 038.18 new character from hub (full guided flow) · 038.19 end-to-end smoke test

## Sub-tickets

### 038.1 Spec + shared types

#### Description
Document the campaign hub, multi-character, death/obituary, party-roster, and cross-character encounter models under `/shared`. This ticket is the contract every other sub-ticket implements against.

Cover:
- **`HubEligibility`**: campaign is hub-eligible when `characters.some(c => c.kind === 'player' && c.guidedCreationPhase === 'complete')`; otherwise existing onboarding routing applies unchanged
- **`CharacterLifeStatus`**: `alive` | `dead` with documented triggers: legendary lost dying sequence, respawn exhausted, execute defeat under legendary, story-driven death (DM-flagged / engine hook — document Standard-mode sacrificial death path even though combat revert normally applies)
- **`CharacterObituary`**: `{ generatedAt, deathCause, narrativeBody, npcReactions: { npcId, npcName, tone: 'positive' | 'negative' | 'neutral', reaction }[] }` — persisted on character, not player-editable
- **`PartyRoster`**: each `ai_party_member` has `ownerPlayerCharacterId`; campaign may have shared/unowned members (`null` owner) creatable at first character setup; recruitment from another player's roster **reassigns** `ownerPlayerCharacterId`
- **`InactivePlayerProxy`**: when active character A encounters inactive living player character B, B is narrated/acted by an agent call grounded in B's narration log, journal, log book, identity fields, and current region — not chat-history-only
- **`CrossCharacterLogWrite`**: agent/DM pipeline may emit paired log-book proposals for both active and encountered inactive player characters
- **`PlayAwareHubSnapshot`**: extends `CampaignDetail` with `currentStateSummary`, per-region destroyed/changed flags if applicable, story-thread current state/summary, and a capped recent-events slice for the preview panel
- **`UngeneratedTravelIntent`**: travel target described by player text with no matching region row → triggers generation before travel resolves
- hub layout: sidebar (existing) + center preview + right cast rail; onboarding `CampaignReview` unchanged

#### Acceptance Criteria
- [x] Spec file under `/shared` documents all types above with field meanings and authority boundaries (engine vs agent vs UI)
- [x] Spec explicitly states hub is a **new screen**, not a mode flag on onboarding `CampaignReview`
- [x] Spec documents that dead characters do not enter play but remain visible on the cast rail with obituary access

### 038.2 DB schema: death status, obituary, party ownership

#### Description
Forward-only migrations for multi-character persistence gaps.

Add to `characters` (player rows):
- `life_status` (`alive` | `dead`, default `alive`)
- `died_at` (nullable ISO timestamp)
- `death_cause` (nullable text — short machine/human label: `legendary_dying`, `respawn_exhausted`, `execute_defeat`, `story_sacrifice`, …)
- `obituary_json` (nullable JSON matching `CharacterObituary`)

Add to `characters` (ai_party_member rows):
- `owner_player_character_id` (nullable FK → `characters.id` where kind = `player`)

#### Acceptance Criteria
- [x] Migration applies cleanly on existing saves; all existing player characters default to `life_status = alive`
- [x] Schema tests verify new columns/constraints
- [x] Repository read/write round-trips life status, obituary, and party ownership
- [x] Unit tests cover isolation: obituary on character A never returned for character B

### 038.3 Death status persistence + story-driven death hook

#### Description
Today permanent death is returned as a turn message but not durably flagged on the character row. Wire all death outcomes from `dyingResolution.ts`, `playerDefeat.ts`, and a new **story-driven death** hook (DM narration schema flag or dedicated intent — document in spec) to set `life_status = dead`, `died_at`, and `death_cause` on the player character.

Standard-mode combat death still **reverts** via save snapshot as today — no death flag. Story-driven death under Standard **does** persist death when the DM/engine marks `story_sacrifice` (or equivalent).

Depends on **038.1**, **038.2**.

#### Acceptance Criteria
- [x] Legendary lost dying sequence sets `life_status = dead` on the character row
- [x] Respawn-exhausted death sets `life_status = dead`
- [x] Execute defeat under legendary sets `life_status = dead`
- [x] Story-driven death path sets `life_status = dead` without requiring a lost dying sequence
- [x] Standard combat revert path does **not** set `life_status = dead`
- [x] Unit tests cover each path; reloading the character from SQLite reflects death

### 038.4 Obituary agent + generation pipeline

#### Description
Add a DM-agent call triggered **synchronously when death is persisted** (before play UI unblocks). Input: character identity summaries, journal entries, log-book entries (especially People), death cause/event payload, campaign `current_state_summary`, and NPCs with meaningful history (positive/negative) derived from log-book People entries and `npc_memories` where the character is involved.

Output schema: `deathCause` (short), `narrativeBody` (multi-paragraph), `npcReactions[]` with `npcId`, `tone`, `reaction` text. Invalid JSON retries per existing `MAX_SCHEMA_ATTEMPTS` pattern.

Persist result to `obituary_json` in the same transaction as death status.

Depends on **038.1**, **038.2**, **038.3**.

#### Acceptance Criteria
- [x] Agent prompt grounds on SQLite data listed above, not chat history alone
- [x] Response schema validated; malformed responses retry
- [x] Obituary persisted atomically with death status
- [x] Unit tests: happy path, NPC reaction inclusion when log-book People entries exist, malformed retry

### 038.5 Death-time obituary drafting modal

#### Description
When death is resolved in play, block further input and show a full-screen or centered modal with copy **"Drafting your obituary"** and an indeterminate progress state while **038.4** runs. On success, show the obituary text in the same modal with a single dismiss control that returns the player to the **Campaign Hub** (not `PlayView`).

If obituary generation fails after retries, still route to hub with death flagged and a fallback message ("An obituary could not be written") — do not leave the player stuck in play as a dead character.

Depends on **038.4**, **038.6** (hub routing on dismiss).

#### Acceptance Criteria
- [x] Modal appears immediately on death resolution with "Drafting your obituary" copy
- [x] Player cannot submit turns while obituary is generating
- [x] Successful generation displays obituary; dismiss lands on Campaign Hub with cast rail visible
- [x] Failure path still routes to hub with death status set
- [x] Renderer test or smoke step covers modal visibility strings

### 038.6 Onboarding stage routing + hub gate

#### Description
Extend `OnboardingStage` with `campaignHub`. Update `stageAfterCampaignSelect` and `App.tsx` / `ReadyAppBody`:

- hub-eligible campaign → `campaignHub` (never auto-enter `PlayView`)
- no player character → `review` (unchanged)
- player with incomplete guided creation → resume correct guided stage (unchanged)
- from hub, selecting a living character → `main` + `PlayView` for that `characterId`
- from hub, "New character" → `characterSetup` (and onward through guided creation); on completion of opening scene, enter play per **038.18**

`findPlayerCharacter` must not assume a single player — introduce `listPlayerCharacters` / `getActivePlayerCharacterId` session state held in renderer (and passed to `PlayView`).

Depends on **038.1**.

#### Acceptance Criteria
- [x] Selecting a hub-eligible campaign opens `CampaignHub`, not `PlayView`
- [x] Onboarding campaigns still route to `review` / `characterSetup` / guided stages unchanged
- [x] Reload mid-hub resumes `campaignHub` for hub-eligible campaigns
- [x] Unit tests for `stageAfterCampaignSelect` cover hub vs onboarding vs play paths

### 038.7 Hub IPC + play-aware world snapshot

#### Description
Add typed IPC (main/preload/renderer) to fetch `PlayAwareHubSnapshot` for a campaign: everything in `CampaignDetail` plus `currentStateSummary`, story threads with live state/summary, region extras reflecting current `region_history`, and recent campaign events (capped, e.g. last 20) for the preview panel. Include all player characters with `life_status`, portrait, level, class, last-known region name, and obituary presence flag.

Depends on **038.1**, **038.2**.

#### Acceptance Criteria
- [x] Preload exposes `campaigns:getHubSnapshot(campaignId)` with typed response
- [x] Snapshot includes play-aware fields documented in 038.1
- [x] Dead characters include obituary when present
- [x] Unit tests verify snapshot assembly from seeded DB fixtures

### 038.8 CampaignHub layout shell

#### Description
New `CampaignHub` screen: existing sidebar on the left, main content area, right **cast rail**. Header shows campaign name, premise snippet, and last-played date. Reuse tavern/onboarding visual language; not the in-campaign four-column layout.

Wire into `onboardingStageRoutes.tsx` for stage `campaignHub`.

Depends on **038.6**.

#### Acceptance Criteria
- [x] Layout renders sidebar + center slot + right rail slot
- [x] Campaign name, premise, and last-played visible in hub header
- [x] Hub does not render `PlayView` or in-campaign columns
- [x] Component test covers three-column structure and header fields

### 038.9 Read-only play-aware world preview

#### Description
Center panel: read-only world preview using shared subcomponents extracted from `CampaignReview` where sensible (`CampaignReviewStory`, region/NPC cards) but **without** edit controls. Show `currentStateSummary`, story-thread state/summary, regions with current descriptions/history/quest hooks, NPCs per region, and a **Recent events** section from the snapshot.

Destroyed or materially changed regions (if tracked via world facts / region history / events — use existing data, add flags only if needed) must be visually indicated in preview copy.

Depends on **038.7**, **038.8**.

#### Acceptance Criteria
- [x] Region/NPC/story content is read-only — no inline editors
- [x] `currentStateSummary` and recent events render when present
- [x] Story threads show current state + summary, not just initial generation text
- [x] Shared components extracted; onboarding `CampaignReview` still supports editing
- [x] Renderer tests cover read-only mode and recent-events section

### 038.10 Cast rail: character select, skull, new character

#### Description
Right rail lists all `kind === 'player'` characters for the campaign. Each card shows portrait (or placeholder), name prefixed with **skull and crossbones** when `life_status === dead`, class, level, and last-known region. Living characters are selectable — primary action **Resume** enters play for that character. Dead characters expose **View obituary** (handled in **038.11**). Footer action **Create new character** starts the new-character flow.

Only one living character may be "entering play" at a time; dead characters are not selectable for play.

Depends on **038.7**, **038.8**.

#### Acceptance Criteria
- [x] All player characters in the campaign appear on the rail
- [x] Dead characters show skull and crossbones before the name
- [x] Selecting Resume on a living character transitions to `PlayView` with that `characterId`
- [x] Create new character button is always visible on the hub
- [x] Renderer tests cover alive vs dead card rendering

### 038.11 Hub obituary view modal (blocking)

#### Description
When the player clicks **View obituary** on a dead cast entry, open a modal showing persisted obituary (`narrativeBody`, `deathCause`, NPC reactions). Modal is **modal in the strict sense**: cast-rail Resume and Create actions are disabled until the obituary modal is dismissed. Living-character Resume is also blocked while obituary modal is open.

Distinct from **038.5** (death-time drafting) — this is read-only review from the hub.

Depends on **038.10**.

#### Acceptance Criteria
- [x] Obituary modal displays narrative, death cause, and NPC reaction list
- [x] While open, Resume and Create new character are disabled
- [x] Dismiss re-enables cast-rail actions
- [x] Missing obituary (legacy dead row) shows a clear empty state, not a crash

### 038.12 Active character selection through play shell

#### Description
Plumb selected `characterId` through `PlayView`, turn IPC, narration log, character sheet, journal, log book, level-up modal, and `findPlayerCharacter` call sites. Session recap, saves, and campaign-level world mutations remain shared; narration log queries filter by active `characterId`.

Replace `findPlayerCharacter(characters)` with explicit active-character id from app state everywhere play behavior depends on "the" player.

Depends on **038.6**.

#### Acceptance Criteria
- [x] `PlayView` receives and uses explicit `characterId` — not first player row
- [x] Turn submission, narration log, sheet, journal, and log book all scope to active `characterId`
- [x] Switching characters from hub loads the correct per-character state (region, HP, inventory, log book)
- [x] Unit/integration tests prove two player characters in one campaign do not leak log entries or narration between them

### 038.13 Per-character party roster + cross-roster transfer

#### Description
Scope AI party members to `owner_player_character_id`. `CharacterSetup` for the **first** character may create shared members (`owner` null or first player — document choice in **038.1** and apply consistently). New characters from hub may attach to existing shared members or create new ones.

When promotion/recruitment pulls a hero from another player character's roster (DM-flagged or existing promotion flow extended), **reassign** `owner_player_character_id` to the recruiting character. Combat turn order and party-member agent calls use the **active** character's roster only.

Depends on **038.1**, **038.2**, **038.12**.

#### Acceptance Criteria
- [x] `listPartyMembersForPlayer(db, playerCharacterId)` returns owned + shared members per spec
- [x] Creating a second player character does not duplicate shared roster members
- [x] Recruitment/promotion transfer updates `owner_player_character_id` and removes the member from the prior owner's combat roster
- [x] Unit tests cover shared members, owned members, and transfer between two player characters

### 038.14 Inactive player-character AI proxy + encounter grounding

#### Description
When narration/DM context detects the active character encountering another **living, inactive** player character in the shared world, invoke a dedicated agent path (extend party-member or new `inactivePlayer` agent) to speak/act for the inactive character. Ground on: inactive character's narration log, journal, log book, identity summaries, `currentRegionId`, and public campaign state.

Inactive character does not need to be "online" — they are a world presence driven by persisted history.

Depends on **038.1**, **038.12**.

#### Acceptance Criteria
- [x] Agent context assembly loads inactive player character data from SQLite, not chat history
- [x] Encounter produces DM-facing reply and/or structured actions for the inactive character
- [x] Agent does not mutate inactive character mechanical stats without a normal turn resolution
- [x] Unit tests with two player characters seeded in the same region verify correct grounding payload

### 038.15 Cross-character interaction log-book writes

#### Description
Extend DM narration side effects so when an inactive player proxy participates in a scene, log-book entry proposals can target **both** the active character and the inactive player character (paired entries from one narration turn). Entries persist under each character's id per **025** isolation rules.

When the inactive character's story is later resumed, their log book already contains the encounter.

Depends on **038.14**.

#### Acceptance Criteria
- [x] Narration schema supports optional `logBookEntriesForCharacterId` (or paired array) in addition to acting character
- [x] Paired entries persist to two character ids in one transaction
- [x] Invalid category entries dropped per 025 rules
- [x] Unit tests: encounter turn writes to both characters; each list API returns only its own entries

### 038.16 Campaign-history-aware region generation (hub)

#### Description
Upgrade `generateAdditionalRegion` / `buildAdditionalRegionPrompt` to accept campaign history context: region names **and** descriptions, `region_history` excerpts, story-thread summaries, `current_state_summary`, and recent world-altering events. Hub **Generate another region** button opens the existing seed modal pattern but calls the enriched pipeline.

Reject duplicate region names as today.

Depends on **038.9**.

#### Acceptance Criteria
- [x] Hub generate-region uses history-aware prompt, not premise + names only
- [x] Generated region persists with `region_history` seeded consistently with 007
- [x] Unit tests assert prompt/context includes at least one history field from fixtures
- [x] Hub preview refreshes after successful generation

### 038.17 Mid-play travel to ungenerated region + loading modal

#### Description
When travel intent targets a place with no matching region (DM interprets destination as new location), block travel resolution, show loading modal copy informing the player the destination is being generated (e.g. **"The way ahead is uncharted — preparing your destination…"**), run history-aware region generation seeded from the travel destination text, then complete travel into the new region.

If generation fails, show error and do not advance travel.

Depends on **038.16**, **038.12**.

#### Acceptance Criteria
- [x] Travel to unknown destination triggers generation before `currentRegionId` updates
- [x] Loading modal visible during generation with player-facing copy
- [x] Successful generation creates region + NPCs and completes travel
- [x] Failure leaves player in origin region with error message
- [x] Unit/integration test covers travel → generate → arrive sequence with mock provider

### 038.18 New character from hub (full guided flow)

#### Description
**Create new character** from cast rail enters existing `CharacterSetup` → guided identity → opening scene pipeline (**026**). Death mode selection on repeat characters: skip re-setting campaign death mode if already configured (first character wins). Party setup may offer existing shared AI members (**038.13**). On opening-scene completion, enter `PlayView` for the new character (**default: enter play** for the new character).

After creation, hub cast rail shows the new entry on next visit.

Depends on **038.6**, **038.10**, **038.13**.

#### Acceptance Criteria
- [x] Full mechanical + guided flow runs from hub without skipping phases
- [x] Campaign death mode not re-prompted when already set on campaign row
- [x] New player row appears on hub cast rail after completion
- [x] Opening-scene handoff enters play for the new `characterId`
- [x] Smoke or integration test creates second character from hub-eligible campaign

### 038.19 End-to-end smoke test

#### Description
CDP or runbook smoke covering: create campaign → first character through guided play → return to sidebar → re-select campaign lands on hub (not play) → generate region from hub → create second character → play as second character → encounter first character (inactive proxy + dual log-book entries) → kill first or second character under legendary → obituary drafting modal → hub with skull → view obituary blocking modal → travel to ungenerated location with loading modal.

Document in `/docs/runbooks/campaign-hub-smoke-test.md`.

Depends on all prior **038.x** tickets.

#### Acceptance Criteria
- [x] Runbook committed with step-by-step instructions and expected UI strings
- [x] Automated smoke script covers hub gate and at least one of: multi-character or obituary or travel-generation (full matrix ideal)
- [x] Smoke pass recorded in runbook with date and provider used

