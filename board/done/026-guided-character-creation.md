# EPIC: Guided character creation (DM interview + opening scene)

Replace the post-setup **Begin Adventure** one-shot with a two-phase, live DM conversation that happens **outside** the in-campaign four-column play shell. After the player finishes mechanical setup (stats, archetype, party, death mode, portraits) on the existing `CharacterSetup` screen, the primary action becomes **Tell me about yourself** — launching a single-thread chat UI where the DM agent interviews the player to capture four identity foundations: **Who** they are, **Why** they are (their purpose/motivation), **Where** they are, and **What** they are (nature, role, or defining traits). The DM may pose follow-up questions and probe with layered "why" questions within each foundation before marking that dimension satisfied.

When all four foundations are complete, the DM's synthesized view is persisted on the player character record and a second action appears: **Help me set the stage** — another single-thread conversation where the player and DM negotiate the opening scene. Only after both phases complete does the app hand off into the normal in-campaign `PlayView`.

This epic adds persistence for interview transcripts and DM-captured summaries, new agent prompts with structured completeness detection (same JSON-schema retry pattern as `dm.ts` / `campaignGeneration.ts`), onboarding stage extensions in `App.tsx`, and a dedicated pre-play conversation shell styled consistently with the tavern loading/onboarding UI — not the sidebar + play columns layout.

Broken down into sub-tickets 026.1-026.10. This epic is done when all of them are.

026.1 identity foundations spec + guided-creation persistence schema · 026.2 guided-creation transcript repository · 026.3 DM identity-interview agent prompt + completeness schema · 026.4 DM opening-scene negotiation agent prompt + schema · 026.5 onboarding stage machine + defer play entry until guided flow completes · 026.6 guided-creation IPC contract (renderer/main/preload) · 026.7 pre-play conversation shell UI (single-thread layout) · 026.8 identity phase: Tell me about yourself entry + foundation progress + sheet persistence · 026.9 opening-scene phase: Help me set the stage + scene persistence + play handoff · 026.10 character sheet identity/scene display + end-to-end smoke test

## Sub-tickets

### 026.1 Identity foundations spec + guided-creation persistence schema

#### Description
Define the canonical contract for the four identity foundations (Who / Why / Where / What) and add forward-only DB migrations to persist guided-creation state: per-foundation DM summaries on the player character, opening-scene text, phase completion flags, and enough structure for transcript rows in 026.2.

#### Acceptance Criteria
- [x] Shared types document each foundation's meaning, completion criteria, and the DM-synthesized field shape stored on the character
- [x] Migration adds character columns (or a single JSON column with a documented schema) for `identity_who`, `identity_why`, `identity_where`, `identity_what`, `opening_scene`, and `guided_creation_phase` (`none` | `identity` | `opening_scene` | `complete`)
- [x] Migration adds a `guided_creation_messages` table scoped to campaign + character with role (`player` | `dm`), phase, content, and created-at timestamp
- [x] Schema tests verify new tables/columns exist after migration upgrade

### 026.2 Guided-creation transcript repository

#### Description
Implement repository functions for guided-creation messages and character identity/opening-scene fields introduced in 026.1.

#### Acceptance Criteria
- [x] Repository can append a message, list messages for a character filtered by phase, and list full transcript in chronological order
- [x] Repository can read/update per-foundation identity summaries and opening-scene text on the player character
- [x] Repository can advance `guided_creation_phase` atomically when a phase completes
- [x] Unit tests cover append/list isolation (one character's transcript never leaks to another) and phase transitions

### 026.3 DM identity-interview agent prompt + completeness schema

#### Description
Add a DM-agent call dedicated to the identity interview phase: given the campaign premise, mechanical character facts (name, archetype, stats), and the conversation transcript so far, return a player-facing reply plus structured foundation status and extracted summaries when a dimension is ready to lock in.

#### Acceptance Criteria
- [x] Prompt instructs the DM to interview for Who / Why / Where / What, ask follow-up questions freely, and avoid inventing mechanical stats or outcomes
- [x] Response schema includes: `dmReply` (string), `foundations` (per-dimension `complete` boolean + optional `summary` string), and `allFoundationsComplete` boolean
- [x] Invalid JSON responses retry up to the existing `MAX_SCHEMA_ATTEMPTS` pattern used in `dm.ts`
- [x] Unit tests cover: partial completion, all-complete, and malformed-response retry behavior with a mock provider

### 026.4 DM opening-scene negotiation agent prompt + schema

#### Description
Add a DM-agent call for the opening-scene phase: given locked identity foundations, campaign regions/NPCs/story thread, and the scene-setting transcript, co-create an opening scene the player agrees to start play from.

#### Acceptance Criteria
- [x] Prompt grounds the DM in persisted identity summaries and campaign seed data (regions, NPCs, story thread) — not chat-history-only context
- [x] Response schema includes: `dmReply` (string), `proposedOpeningScene` (string), and `sceneReady` (boolean) when the player and DM have converged
- [x] Agent does not resolve checks, grant items, or mutate world state — scene text is narrative setup only until play handoff
- [x] Unit tests cover scene-not-ready vs scene-ready responses and schema validation retries

### 026.5 Onboarding stage machine + defer play entry until guided flow completes

#### Description
Extend `App.tsx` onboarding stages so mechanical character setup, guided identity interview, guided opening scene, and in-campaign play are distinct. Entering `PlayView` requires `guided_creation_phase === 'complete'` on the player character — not merely that a player character row exists.

#### Acceptance Criteria
- [x] `App.tsx` stage union adds `guidedIdentity` and `guidedOpeningScene` (or equivalent) between `characterSetup` and play
- [x] `CharacterSetup` submit persists the player character and party but transitions to `guidedIdentity` instead of jumping straight to play
- [x] `ReadyAppBody` does not render `PlayView` until guided creation is complete, even if a player character already exists
- [x] Reloading the app mid-guided-creation resumes the correct phase from persisted `guided_creation_phase`
- [x] Unit or integration test verifies play is blocked until phase is `complete`

### 026.6 Guided-creation IPC contract (renderer/main/preload)

#### Description
Define typed IPC for sending a player message in either guided-creation phase, invoking the appropriate DM agent (026.3 / 026.4), persisting transcript rows, and returning the DM reply plus phase status.

#### Acceptance Criteria
- [x] Preload exposes `guidedCreation.sendMessage({ campaignId, characterId, phase, message })` with a typed response: `dmReply`, foundation status or `sceneReady`, and updated `guidedCreationPhase`
- [x] Main process validates payload shape, loads transcript + character/campaign context from SQLite, calls the correct agent, persists player + DM messages and any newly completed foundation summaries in one transaction
- [x] IPC returns typed failure categories (provider error, schema error, not found) without leaking raw provider payloads
- [x] Unit tests verify validation, happy-path persistence, and that a message in the wrong phase is rejected

### 026.7 Pre-play conversation shell UI (single-thread layout)

#### Description
Build a dedicated full-width onboarding view (sidebar may remain for campaign context, but **not** the in-campaign four-column `PlayView`) presenting one scrolling conversation thread: DM messages and player messages in order, with a text input and send control at the bottom. Reuse the tavern/onboarding visual language from the loading screen and campaign-start modal.

#### Acceptance Criteria
- [x] Conversation shell renders outside `InCampaignLayout` / `PlayView` — no DM exposition panel, player action panel, or sheet rail from the active-campaign UI
- [x] Thread shows chronological messages with distinct player vs DM styling; auto-scrolls on new messages
- [x] Input is disabled while a DM reply is in flight; duplicate sends are blocked
- [x] Loading and provider-error states are shown inline without crashing the shell
- [x] Component tests or renderer tests cover empty thread, populated thread, and in-flight send state

### 026.8 Identity phase: Tell me about yourself entry + foundation progress + sheet persistence

#### Description
Wire the mechanical `CharacterSetup` screen to offer **Tell me about yourself** instead of **Begin Adventure**. On click, transition to the conversation shell (026.7) in identity phase. When the DM agent marks all four foundations complete, persist summaries on the character and reveal **Help me set the stage**.

#### Acceptance Criteria
- [x] `CharacterSetup` primary button label is **Tell me about yourself**; it validates and submits mechanical setup first if not already persisted, then opens the identity conversation
- [x] Identity phase uses `guidedCreation.sendMessage` with `phase: 'identity'`
- [x] UI shows subtle progress for Who / Why / Where / What (e.g. incomplete vs complete indicators) driven by IPC foundation status — not hardcoded turn counts
- [x] When `allFoundationsComplete` is returned, foundation summaries are persisted and **Help me set the stage** appears; identity-phase input is disabled or the CTA clearly advances to the next phase
- [x] Resuming a campaign mid-identity-phase reloads transcript and progress from SQLite

### 026.9 Opening-scene phase: Help me set the stage + scene persistence + play handoff

#### Description
Second guided-creation phase: **Help me set the stage** opens the same conversation shell in opening-scene mode. When the DM and player converge (`sceneReady`), persist `opening_scene` on the character, set `guided_creation_phase` to `complete`, and hand off into normal in-campaign play.

#### Acceptance Criteria
- [x] **Help me set the stage** is only available after all four identity foundations are complete
- [x] Opening-scene phase uses `guidedCreation.sendMessage` with `phase: 'opening_scene'`
- [x] When `sceneReady` is true, `opening_scene` text is persisted and the player can enter the campaign (e.g. **Enter the world** or equivalent) — replacing the old **Begin Adventure** jump
- [x] Play handoff loads `PlayView` with the persisted opening scene available to seed the first DM exposition (026.10 may surface it on the sheet; play column should not silently discard it)
- [x] Player can still read the full identity + scene conversation transcript after handoff (read-only)

### 026.10 Character sheet identity/scene display + end-to-end smoke test

#### Description
Surface DM-captured identity foundations and opening-scene text on the player character sheet, then validate the full guided-creation loop in a running app (dev + packaged smoke).

#### Acceptance Criteria
- [x] Character sheet (and/or player sheet rail) displays Who / Why / Where / What summaries and opening-scene text when present — read-only, sourced from persisted character fields
- [x] Empty/missing guided-creation fields show clean empty states, not errors
- [x] Smoke test (script + runbook): mechanical setup → **Tell me about yourself** → multi-turn identity chat until foundations complete → **Help me set the stage** → scene ready → enter play → sheet shows persisted identity + scene
- [x] Smoke test confirms play view does not appear before guided creation completes and transcript survives app restart mid-flow
