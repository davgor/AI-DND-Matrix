# EPIC: Alignment, temperament, and non-speaking creature actions

Add **alignment** as a first-class character attribute. Player alignment is chosen once during character setup (name + stat selection) via a dropdown and is **static from the player's perspective** — it is not editable in the character sheet or setup replay. Only the **DM agent** can change a player character's alignment at runtime, and only through a deliberate two-step flow: first flag a pending alignment shift with a warning, then commit the new alignment if the player continues with the action that would cross the line.

For NPCs and catalog creatures/monsters, add **temperament** and a **can speak** flag. Alignment captures moral/ethical stance for sentient entities; **disposition** (already on NPCs) stays the relationship toward the player; **temperament** describes scene behavior (aggressive, skittish, territorial).

When `canSpeak` is false, the NPC/creature agent emits third-person **action descriptions** wrapped in markdown bold (`**…**`), rendered bold in the exposition feed. Speaking NPCs and party members keep italic dialogue as today.

When the DM flags a pending alignment shift, the **DM exposition pane** shows a high-visibility warning (striking color, `role="alert"`) with the DM's warning copy — e.g. that the player may no longer be their current alignment if they proceed. The player may still submit their next action; if they do, the DM may commit the alignment change on that turn.

Broken down into sub-tickets 028.1–028.10. This epic is done when all of them are.

Definition of done:
- shared types document alignment, temperament, `canSpeak`, and the pending-shift / commit flow
- player alignment set only at character setup; read-only everywhere else for the player
- DM narration schema supports `alignmentShiftWarning` and `commitAlignmentShift`
- exposition UI shows a striking alignment-shift warning banner while a shift is pending
- non-speaking creatures render bold action lines; speaking NPCs stay italic
- smoke test covers setup alignment, a pending warning, and a committed shift on continued play

028.1 alignment/temperament/speech spec + shared types · 028.2 DB schema + repositories · 028.3 player alignment dropdown at character setup (static after) · 028.4 campaign generation NPC fields · 028.5 catalog creature seed temperament + canSpeak · 028.6 NPC/creature agent reaction schema · 028.7 narration log + exposition UI (bold action + alignment warning banner) · 028.8 character sheet display + campaign review NPC edit · 028.9 end-to-end smoke test · 028.10 DM alignment-shift warning flag and commit on continued play

## Sub-tickets

### 028.1 Alignment, temperament, and speech capability spec + shared types

#### Description
Define the canonical contract for alignment (nine-grid lawful/chaotic × good/evil plus true neutral), temperament (behavioral adjectives separate from player-facing disposition), and `canSpeak`. Document rendering rules: speaking entities emit dialogue (italic in UI); non-speaking entities emit third-person action text wrapped in `**` (bold in UI).

Document the **alignment-shift state machine** for player characters:
- Alignment is player-chosen once at character setup and treated as static in all player-facing edit surfaces.
- Only the DM agent may initiate a change via `alignmentShiftWarning: { proposedAlignment, warningText }` on a narration result when the player's action threatens their current alignment.
- Warning persists on the character as `pendingAlignmentShift` until cleared or committed.
- If the player submits a **continuing** action while a warning is pending (same moral choice thread — detected by DM with pending state in narration context), the DM may emit `commitAlignmentShift: { newAlignment }` to apply the change and clear the pending state.
- The DM may also clear a pending warning without shifting alignment if the player backs down in fiction.

Add shared types in `/shared` consumed by DB, agents, main IPC, and renderer.

#### Acceptance Criteria
- [x] Shared types export `Alignment`, `Temperament`, `canSpeak`, `PendingAlignmentShift`, and DM proposal shapes for warning/commit
- [x] Spec documents how alignment differs from disposition and party-member personality
- [x] Spec documents agent output: `dialogue` vs `actionDescription` (`**`) by `canSpeak`
- [x] Spec documents the two-step DM-only alignment change flow and that players never self-edit alignment after setup
- [x] Unit tests validate alignment enum parsing/normalization and pending-shift shape validation

### 028.2 DB schema + repositories for alignment, temperament, and canSpeak

#### Description
Forward-only migrations add `alignment` on `characters` (set at setup, updated only by DM commit path), `pending_alignment_shift` JSON on `characters` (nullable; stores proposed alignment + warning text + flagged timestamp), `alignment`/`temperament`/`can_speak` on `npcs`, and `temperament`/`can_speak` on `catalog_creatures`. Repository helpers: set/clear pending shift, commit alignment shift (atomic update alignment + clear pending).

#### Acceptance Criteria
- [x] Migration adds columns without breaking existing saves; schema tests verify columns after upgrade
- [x] `characters` repository reads/writes alignment and pending shift; commit helper updates alignment and clears pending in one transaction
- [x] `npcs` repository reads/writes alignment (optional), temperament, and canSpeak
- [x] `catalog_creatures` repository reads/writes temperament and canSpeak
- [x] Unit tests cover create/read/update, pending-shift round-trip, and commit clearing pending state

### 028.3 Player alignment dropdown at character setup (static after)

#### Description
Add a required **alignment** dropdown on `CharacterSetup`, alongside character name and archetype / ability-score assignment. The player picks one of the nine alignments before submitting setup. Persist on the player character row. After setup completes, alignment is **read-only** for the player everywhere in the UI — no character-sheet edit control, no re-pick in guided creation. Guided-creation DM context may **reference** the stored alignment for roleplay but must not overwrite it.

#### Acceptance Criteria
- [x] `CharacterSetup` exposes a dropdown with all nine alignments and short helper labels, placed with name/archetype/stats fields
- [x] Setup validation rejects submit when alignment is unset
- [x] Submitting character setup persists alignment on the player character
- [x] Guided-creation IPC/context includes alignment read-only for DM grounding; no write path from guided creation back to alignment
- [x] Character sheet identity section displays alignment read-only (no edit affordance)
- [x] Tests cover persistence, validation, and that no player-facing IPC allows direct alignment mutation

### 028.4 Campaign generation NPC fields (alignment, temperament, canSpeak)

#### Description
Extend `campaignGeneration.ts` generated-NPC JSON schema and persistence so each starting NPC includes alignment (when sentient), temperament, and `canSpeak`. Prompt instructs the model: merchants and quest-givers speak; beasts and mindless undead do not. Validation rejects missing required fields.

#### Acceptance Criteria
- [x] Generation prompt and validator require `temperament` and `canSpeak` on every generated NPC
- [x] `canSpeak: false` NPCs get temperament suited to beasts/monsters; `canSpeak: true` NPCs include alignment
- [x] `createNpc` persists all new fields; campaign-create integration tests pass with updated fixtures
- [x] Campaign review UI shows temperament and a speaks/does-not-speak indicator per NPC

### 028.5 Catalog creature seed temperament + canSpeak

#### Description
Add `temperament` and `canSpeak` to every entry in `CREATURE_SEEDS_V1` (bump seed version where needed). Beasts, oozes, and similar entries default `canSpeak: false`; humanoids and dragons default `canSpeak: true` unless the fiction says otherwise. Import pipeline validates the new required fields.

#### Acceptance Criteria
- [x] Every v1 creature seed includes temperament and canSpeak
- [x] Import validation rejects seeds missing either field
- [x] Representative coverage: at least one non-speaking beast and one speaking humanoid in the dataset
- [x] Catalog retrieval surfaces temperament and canSpeak to agent context assembly

### 028.6 NPC/creature agent reaction schema (dialogue vs bold action)

#### Description
Branch `generateNpcReaction` (and any catalog-creature encounter reaction path) on `npc.canSpeak`. Speaking NPCs keep the existing `{"dialogue": string, "attack"?: boolean}` contract. Non-speaking entities use `{"actionDescription": string, "attack"?: boolean}` where `actionDescription` is third-person prose wrapped in `**`. Prompts ground alignment, temperament, and the no-dialogue rule. Memories store the raw reaction text either way.

#### Acceptance Criteria
- [x] `canSpeak: true` path unchanged for happy-path tests; prompt includes alignment and temperament
- [x] `canSpeak: false` path rejects bare dialogue JSON and requires `actionDescription` with `**` delimiters
- [x] Invalid or missing delimiters fall back to wrapping the model output in `**` server-side
- [x] `turnIpc` event payload records `reactionKind: 'dialogue' | 'action'` plus the text field
- [x] Unit tests cover both branches and attack flag behavior

### 028.7 Narration log + exposition UI (bold action + alignment warning banner)

#### Description
Extend `PlayLogEntry` (or event-to-log mapping) so NPC/creature lines carry `reactionKind` (`dialogue` | `action`). `DmExpositionPanel` renders dialogue in italics and action lines in bold (parse/strip surrounding `**`).

Add an **alignment-shift warning banner** at the top of the DM exposition panel (below the scene header, above the feed) when the active player character has a `pendingAlignmentShift`. Use a striking warning color (e.g. amber/orange or deep red on dark theme), `role="alert"`, and display the DM's `warningText` plus current vs proposed alignment labels. Banner remains visible across turns until the pending state is cleared or committed. Player action panel is unchanged — continuing play means submitting the next action as usual.

#### Acceptance Criteria
- [x] `buildNarrationLog` maps `npc_reaction` events with `reactionKind` into log entries; legacy events default to dialogue
- [x] Renderer shows action lines in bold without visible `**` markers
- [x] Exposition panel receives pending alignment shift from IPC/turn result and renders the warning banner with accessible contrast
- [x] Banner copy makes clear the player may no longer be their current alignment if they proceed
- [x] Banner hides when pending shift is null; component tests cover banner visible/hidden and italic vs bold entries

### 028.8 Character sheet display + campaign review NPC edit

#### Description
Show player alignment read-only on the character sheet identity section (no edit control — changes only via DM shift flow in 028.10). On campaign review, allow editing NPC disposition (existing), alignment, temperament, and canSpeak toggle. NPC promotion copies alignment/temperament into character metadata when present.

#### Acceptance Criteria
- [x] Character sheet identity section displays player alignment read-only
- [x] No player-facing UI or IPC to edit player alignment after setup
- [x] Campaign review exposes temperament and canSpeak per NPC with save via existing edit IPC pattern
- [x] NPC promotion copies alignment to promoted character metadata when present
- [x] IPC tests cover NPC field edit round-trips

### 028.9 End-to-end alignment + non-speaking creature smoke test

#### Description
Automated smoke test with stub provider: create a campaign and player with alignment from setup; resolve a turn where the DM flags `alignmentShiftWarning`; assert exposition warning state; resolve a follow-up turn where the player continues and the DM emits `commitAlignmentShift`; assert alignment updated and warning cleared. Also assert a non-speaking creature returns bold action text in the log.

#### Acceptance Criteria
- [x] Smoke script or Vitest integration test runs without a live LLM (stub provider with fixed JSON)
- [x] Asserts alignment round-trip from character setup only
- [x] Asserts pending warning persisted and exposed to renderer/turn result after first turn
- [x] Asserts committed shift updates alignment and clears pending on continued play
- [x] Asserts non-speaking reaction uses `actionDescription` / bold rendering path
- [x] Runbook documents manual dev verification steps

### 028.10 DM alignment-shift warning flag and commit on continued play

#### Description
Extend the DM narration schema and turn resolution path so only the DM agent can change player alignment.

**Flag (step 1):** When narration context shows the player's action would threaten their current alignment, the DM may return `alignmentShiftWarning: { proposedAlignment, warningText }`. `persistNarrationSideEffects` stores this as `pendingAlignmentShift` on the character. `TurnResult` includes the pending shift for the renderer banner (028.7).

**Commit (step 2):** Narration context assembly includes any active `pendingAlignmentShift` and the player's latest input. If the player **continues** with the morally consequential action (DM judges from input + pending state), the DM may return `commitAlignmentShift: { newAlignment }` — must match or be consistent with the proposed alignment from the warning. Applying it updates `characters.alignment` and clears pending. The DM may instead narrate backing down and omit commit, or return an explicit clear in a later pass if the player abandons the action.

Prompt instructions: alignment changes are never automatic on flag — only on explicit commit when the player proceeds; do not flag on trivial or ambiguous moments.

#### Acceptance Criteria
- [x] `NarrationResult` types and validator accept optional `alignmentShiftWarning` and `commitAlignmentShift`
- [x] DM prompt documents when to flag vs commit vs clear; includes current alignment and pending shift in context
- [x] `persistNarrationSideEffects` writes pending warning; commit path updates alignment and clears pending atomically
- [x] `TurnResult` surfaces `pendingAlignmentShift` (and `alignmentShiftCommitted` when applicable) to the renderer
- [x] No IPC channel allows the renderer to set alignment directly
- [x] Unit tests cover flag → pending persisted, continue → commit updates alignment, and clear-without-commit path
