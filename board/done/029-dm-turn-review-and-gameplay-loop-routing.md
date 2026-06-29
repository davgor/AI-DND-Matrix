# EPIC: DM turn review and gameplay loop routing

Review and rework the in-campaign turn loop so the **DM agent triages every player submission** before the app decides what to show. Today `turnIpc` always runs `interpretIntent` → engine resolution → `narrate` → a batch of NPC reactions chosen inside the narration JSON. That produces awkward beats — raw player chat in the feed, narration when the player only asked a question, and NPC dialogue buried after a scene paragraph they did not need.

After this epic, when the player types in the action panel the DM first **reviews what they are doing** (addressing someone, performing a visible action, or prompting scene narration) and routes the turn to one or more of three outcomes:

1. **NPC response** — call the NPC/creature agent for the targeted character(s) when the player is conversing with or provoking someone present in the scene. Speaking NPCs return italic dialogue; non-speaking creatures keep the bold action line from epic 028.
2. **DM narration** — the DM describes consequences, environment, and check outcomes when the moment calls for scene-setting or authoritative resolution copy. Engine resolution (checks, damage, rest, travel) still runs first; agents never invent outcomes.
3. **Player action expression** — render what the player character is physically doing as third-person prose in **bold** (same visual language as non-speaking creature actions), instead of echoing raw player chat for action beats.

A single turn may combine outcomes (e.g. express the sword draw, resolve an agility check, narrate the result, then let the goblin react) but the DM review step owns the ordering and which agents fire.

Broken down into sub-tickets 029.1–029.9. This epic is done when all of them are.

Definition of done:
- shared types document turn dispositions, routing rules, and composite-turn ordering
- DM turn-review agent call runs on every player submission and returns a validated routing plan
- `turnIpc` orchestrates NPC, narration, and action-expression paths from that plan — not the current always-narrate-then-batch-react sequence
- exposition feed shows bold player actions and no longer surfaces raw player input for action beats
- party-member beats follow the same routing rules
- smoke test covers conversation, a physical action line, and a narrated check outcome

029.1 turn-review spec + shared routing types · 029.2 DM turn-review agent prompt + schema · 029.3 turnIpc orchestration refactor · 029.4 targeted NPC response path · 029.5 player action expression (events + bold prose) · 029.6 DM narration path integration with engine resolution · 029.7 exposition feed rendering + ordering · 029.8 party-member routing alignment · 029.9 end-to-end gameplay-loop smoke test

## Sub-tickets

### 029.1 Turn-review spec + shared routing types

#### Description
Document how the DM triages a player turn and add shared types under `/shared` for turn dispositions, routing plans, and composite-turn ordering. Cover when to invoke NPC agents vs narration vs player action expression; how mechanical `interpretIntent` (check/rest/travel) composes with narrative routing; and precedence when multiple outcomes apply in one turn. Reference epic 028 `reactionKind` / bold-action conventions so player and creature action lines share one visual contract.

#### Acceptance Criteria
- [x] Spec describes the three routing outcomes (npc response, dm narration, player action expression) with examples for each
- [x] Shared types export `TurnDisposition`, `TurnRoutingPlan`, and ordered `TurnBeat` (or equivalent) usable by agents, `turnIpc`, and the renderer
- [x] Spec states engine resolution remains authoritative for checks, damage, rest, and travel — routing only decides presentation and which agents fire
- [x] Unit tests cover type guards / validation helpers for routing-plan JSON

### 029.2 DM turn-review agent prompt + schema

#### Description
Add a DM agent call (alongside or layered on `interpretIntent`) that ingests player input plus scene context (present NPCs, recent events, log-book window, alignment state) and returns a constrained JSON routing plan: which beats fire this turn, target NPC ids for conversation, whether to express the player's physical action, and whether DM narration is needed. Use the same schema-retry pattern as `dm.ts` / `interpretIntent`.

#### Acceptance Criteria
- [x] Prompt grounds present NPC ids, player alignment, and pending alignment shift the same way `assembleNarrationContext` does today
- [x] Valid plan JSON is parsed with retry on schema failure (max attempts matches existing DM calls)
- [x] Plan can select zero, one, or multiple beats; invalid npc ids are rejected or stripped server-side
- [x] Unit tests cover: converse-only turn, action-expression-only turn, narrate-with-check turn, and composite ordering

### 029.3 turnIpc orchestration refactor

#### Description
Refactor `resolvePlayerTurn` so mechanical resolution (`interpretIntent`, rest/travel, checks, dying) and narrative routing (turn-review plan) compose cleanly. Replace the fixed `resolveCheckTurn` → always `narrate` → always `resolveNpcReactions` pipeline with a dispatcher that executes beats from the routing plan in order. Preserve auto-save snapshots, event append semantics, and alignment-shift side effects.

#### Acceptance Criteria
- [x] `resolvePlayerTurn` calls turn review after mechanical intent is known (or in a documented single-pass if combined)
- [x] Rest, travel, and dying paths still bypass or override routing where the spec says they must
- [x] Each executed beat appends the correct event type(s) and returns a `TurnResult` shape the renderer already consumes (extended only where 029.5–029.7 require)
- [x] Existing `turnIpc` tests updated; no regression on check resolution, HP, or in-game date advancement

### 029.4 Targeted NPC response path

#### Description
When the routing plan selects NPC response, invoke `generateNpcReaction` for the targeted NPC(s) — including the case where the player is only talking to someone and DM narration is minimal or skipped. Remove the requirement that `reactingNpcIds` only come from the narration JSON. NPC context stays isolated per epic 006; speaking vs non-speaking branches stay per epic 028.

#### Acceptance Criteria
- [x] NPC agent runs only for ids in the routing plan (not every present NPC by default)
- [x] Converse-first turn can return NPC dialogue without a preceding scene paragraph when the plan says so
- [x] `npc_reaction` events record `reactionKind`, text, and optional attack flag as today
- [x] Unit tests cover targeted single-NPC dialogue and non-speaking creature action response

### 029.5 Player action expression (events + bold prose)

#### Description
When the routing plan selects player action expression, emit third-person prose describing what the player character does — wrapped in `**` server-side like creature actions — instead of echoing raw player input in the exposition feed. Add event payload fields (e.g. `player_action` or extend `player_action`) with `actionDescription` and a speaker/kind the log mapper understands.

#### Acceptance Criteria
- [x] DM or a dedicated prompt produces `actionDescription` prose; server wraps/strips `**` consistently with `wrapActionDescription`
- [x] Raw `playerInput` is still stored on the event for audit/debug but is not the default feed line for action beats
- [x] `TurnResult` exposes expressed action text when present so the renderer can append it on the same turn
- [x] Unit tests cover wrap fallback and event round-trip

### 029.6 DM narration path integration with engine resolution

#### Description
When the routing plan selects DM narration, keep the existing `narrate` + `persistNarrationSideEffects` path but only fire it when the plan calls for it. Check outcomes, item grants, log-book proposals, journal entries, and alignment-shift fields remain on the narration schema. Remove or narrow `reactingNpcIds` on the narration result now that NPC routing is plan-driven (029.4).

#### Acceptance Criteria
- [x] Narration runs only when the routing plan includes a narration beat
- [x] Engine check outcome is passed into narration unchanged; DC clamp and roll visibility behavior preserved
- [x] Side effects (world facts, story threads, log book, journal, items, alignment) still persist through `persistNarrationSideEffects`
- [x] Unit tests cover narrate-skipped turn and narrate-after-check turn

### 029.7 Exposition feed rendering + ordering

#### Description
Update `buildNarrationLog` and `DmExpositionPanel` so turn beats appear in routing-plan order: bold player action lines, DM narration, italic NPC dialogue, bold creature actions. Stop showing raw player chat for turns that use action expression. Keep roll-detail toggle and alignment warning banner behavior from epic 028.

#### Acceptance Criteria
- [x] `PlayLogEntry` (or equivalent) distinguishes player action expression from legacy raw player lines
- [x] Renderer renders player action expression in bold without visible `**` markers
- [x] Feed order matches event timestamps / explicit beat order within a turn
- [x] Component tests cover bold player action, italic dialogue, and hidden raw input on action beats

### 029.8 Party-member routing alignment

#### Description
Align AI party-member actions with the new routing model: companions react when the plan or scene warrants it, not automatically after every DM narration. Reuse `decidePartyMemberAction` with context that reflects which beats already fired this turn.

#### Acceptance Criteria
- [x] Party-member agent does not run on converse-only NPC turns unless the plan includes a party beat
- [x] Party lines still append `party_member_action` events and render in the exposition feed
- [x] Unit tests cover party silent on dialogue turn and party action on combat/narration turn

### 029.9 End-to-end gameplay-loop smoke test

#### Description
Add an automated smoke test (and optional runbook under `docs/runbooks/`) that exercises the reworked loop: player addresses an NPC and receives dialogue without redundant narration, player performs a physical action shown as bold prose, and player attempts a check with DM narration of the outcome. Use mock provider fixtures like other agent smoke tests.

#### Acceptance Criteria
- [x] Smoke test runs three turns in one campaign and asserts routing outcomes (NPC text, bold action, narration + check fields)
- [x] Exposition log mapping produces the expected speaker/kind mix
- [x] `npm test` includes the smoke file; runbook documents how to run it in isolation
- [x] No regression on rest, travel, or dying short-circuits
