# EPIC: Combat flee resolution

Give the player a real way to run from a fight. Epic 031 names `flee` as a combat-intent value but never implements it — there is currently no check, no consequence, and no narration path for an escape attempt.

Fleeing is not a single switch that instantly clears the encounter. When the player's free text reads as an attempt to escape ("I bolt for the door", "we need to get out of here"), the DM recognizes that intent, but **whether they actually get away is resolved in two layers**: the engine rolls a deterministic disengage check (Agility-based, contested against the most threatening engaged hostile) every time a flee is attempted — agents never decide hit/miss the way they never decide attack outcomes. Winning that roll only proves the player isn't cut off *this turn*; it does not by itself end the encounter, since hostiles can still be in the room, blocking an exit, or able to pursue. The DM agent's job is the part the engine can't model: given the resolved roll outcome plus scene context (what's actually being fled from and toward), it judges whether this turn's successful disengage means they've cleared the threat entirely or merely bought another round of pursuit — bounded strictly so it can only narrate "fully escaped" on top of an engine-confirmed successful roll, never instead of one.

A failed disengage check costs the player's action for the turn and the encounter continues normally (hostiles act, turn order advances). A successful check that the DM judges as full escape ends the player's part of the encounter — but does not automatically resolve combat for AI party members still present, who keep fighting, retreat with the player, or get left behind per their own routing.

Broken down into sub-tickets 033.1-033.8. This epic is done when all of them are. Builds on epic 031's combat-intent schema and turn loop; requires 031's combat branch to exist first.

Definition of done:
- shared types document flee intent, the disengage check, and partial- vs full-escape state
- engine resolves the disengage check deterministically; provider output cannot set success/failure
- DM combat-intent classification recognizes freeform "trying to flee" text without requiring an exact command
- a failed flee attempt consumes the turn and leaves the encounter active; a successful one doesn't necessarily end it without the DM's bounded escape judgment
- party members left in an encounter the player fled continue to resolve their own turns
- exposition feed and combat HUD distinguish "fleeing, still pursued" from "escaped" from "flee failed"
- smoke test covers a failed attempt, a successful disengage that doesn't clear the encounter, and a full escape

033.1 flee resolution spec + shared types · 033.2 engine disengage-check resolution · 033.3 DM combat-intent flee classification · 033.4 turnIpc flee branch + partial encounter exit · 033.5 DM escape-narration path (bounded by engine outcome) · 033.6 pursuit and party-member continuation after player exit · 033.7 exposition feed + HUD flee states · 033.8 end-to-end flee smoke test

## Sub-tickets

### 033.1 Flee resolution spec + shared types

#### Description
Document the two-layer flee model and add shared types under `/shared` for engine, DB, agents, `turnIpc`, and renderer.

Cover:
- **disengage check**: who it's rolled against (the single most threatening engaged hostile — document exact selection rule, e.g. highest attack bonus among hostiles still able to act) and what beats it (player Agility check + proficiency if applicable, vs the hostile's own Agility-based opposed roll — reuse the existing opposed-check shape from `/engine/checks` if one exists, otherwise document the DC derivation)
- **encounter sub-state**: `engaged` → `disengage_attempted` (per-turn, transient) → either back to `engaged` (failed) or `pursued` (succeeded but not yet judged clear) → `escaped` (DM-judged full clearance) or back to `engaged` if pursuit catches up
- **DM judgment boundary**: the DM may only narrate/return "escaped" on a turn where the engine already returned a successful disengage check for that attempt; it can never override a failed check into a success, and it chooses among "still pursued" vs "fully clear" only when the roll succeeded
- **party-member handling**: fleeing is a player-only action in v1; party members do not automatically flee with the player and keep resolving their own combat turns per epic 031/032 unless a future ticket adds party flee
- **repeat attempts**: failed flee consumes the turn; player may attempt again on their next turn with no penalty beyond the lost action
- **interaction with epic 032**: a fleeing player who fails and is then defeated still routes through defeat-disposition (032.7) normally

#### Acceptance Criteria
- [x] Spec documents disengage-check target selection and pass/fail consequences for both outcomes
- [x] Shared types export `FleeAttemptResult`, `EncounterPursuitState`, and the DM escape-judgment output shape
- [x] Spec states the DM cannot narrate a full escape without a prior successful engine disengage check for that attempt
- [x] Unit tests cover type guards / validation helpers for flee-related JSON shapes

### 033.2 Engine disengage-check resolution

#### Description
Add a pure `/engine` function resolving the flee disengage check: no DB or LLM imports, deterministic given an injected `rng`, mirroring the existing `resolvePlayerAttackAgainstNpc` (031.5) shape.

Inputs: player Agility modifier (+ proficiency if applicable), the selected hostile's opposing Agility-based value, `rng`. Output: structured result with the roll(s), success boolean, and enough detail for narration (e.g. margin) — no narrative text.

Natural-1/natural-20 handling: document whether crit rules apply to a disengage check or whether it's a flat contested roll (recommend flat opposed roll, no crit, since this isn't damage) and test accordingly.

#### Acceptance Criteria
- [x] `resolveFleeAttempt` (or equivalent) is pure engine code with unit tests for clear win, clear loss, and tie-break rule (document which side wins ties)
- [x] Function signature takes stats/modifiers as parameters only — no NPC/character lookups inside engine
- [x] Success/failure is fully determined by the function's return value; no caller can override it post-hoc
- [x] Engine import-boundary test continues to pass with the new file

### 033.3 DM combat-intent flee classification

#### Description
Extend the combat-intent schema/prompt from 031.4 so freeform player text is correctly classified as `combatIntent: flee` without requiring an exact command — "I run for the door," "we need to get out of here," "I'm not dying for this" should all classify as flee attempts; ambiguous text (e.g. moving to a different part of the same room without leaving) should not.

This ticket is intent classification only — it produces the `flee` combat intent the same way `attack` produces a `targetNpcId`. It does not resolve success; that's 033.2/033.4.

#### Acceptance Criteria
- [x] Prompt/schema examples cover clearly-fleeing phrasing classified as `flee`
- [x] Prompt/schema examples cover ambiguous repositioning-but-not-fleeing phrasing classified as something other than `flee`
- [x] Schema validates `flee` requires an active encounter and the player's own turn, same constraint shape as `attack`
- [x] Unit tests cover happy-path classification and rejection of `flee` outside an active encounter/off-turn

### 033.4 turnIpc flee branch + partial encounter exit

#### Description
Wire the disengage check (033.2) into the combat branch (031.7) on `combatIntent: flee`.

On a failed check: consume the player's action for the turn, advance initiative normally — hostiles and party members act as usual, encounter stays `engaged`.

On a successful check: set encounter sub-state to `pursued` (033.1) and surface the result to the DM escape-narration path (033.5) before finalizing the turn. The player does not leave the encounter, and turn advancement is not finalized, until the DM's bounded judgment comes back.

On a DM-judged full escape: mark the player as having exited the encounter (does not end the encounter row outright — see 033.6 for remaining-participant handling), append the relevant event, and stop enforcing the player's turn order slot.

#### Acceptance Criteria
- [x] Failed flee consumes the action and leaves encounter state unchanged otherwise
- [x] Successful disengage without DM-judged full escape keeps the encounter active and returns a "still pursued" turn result
- [x] DM-judged full escape marks the player exited without deleting/ending the encounter row when other combatants remain
- [x] Off-turn or no-active-encounter flee attempts are rejected the same way off-turn attacks are (031.7)
- [x] Integration tests cover failed attempt, successful-but-pursued, and full escape

### 033.5 DM escape-narration path (bounded by engine outcome)

#### Description
Add the DM agent call that judges and narrates a flee attempt's outcome, called only after the engine has already resolved the disengage check (033.2/033.4). Input includes the check result (success/fail, margin), scene context (what's being fled from, available exits/cover per the region description), and whether this is a repeat attempt this encounter.

Output schema:
```json
{"outcome": "still_pursued" | "escaped", "narrationText": "..."}
```
On an engine-failed check, this agent call is skipped entirely — failure narration can reuse the existing combat narration path, not this one. The schema must make `escaped` unreachable when the input check result was a failure (validate server-side, not just prompt-side).

#### Acceptance Criteria
- [x] Agent call only fires on an engine-successful disengage check
- [x] Server-side validation rejects/ignores an `escaped` response if the input check result was a failure (defense in depth beyond prompt wording)
- [x] Prompt grounds scene context (region description, present hostiles) the same way `assembleNarrationContext` does today
- [x] Unit tests cover still-pursued output, escaped output, and the server-side rejection of escaped-on-failed-check

### 033.6 Pursuit and party-member continuation after player exit

#### Description
Define and implement what happens to the rest of the encounter once the player has fully escaped (033.4's DM-judged escape) while AI party members and/or hostiles are still present.

Default v1 rule (document any deviation in 033.1 instead of here): party members still in the encounter keep resolving their own turns per epic 031/032's existing party-combatant turn resolution until the encounter ends on its own terms (all hostiles defeated, hostiles disengage, or a future party-flee ticket). The player re-enters free exploration in the current region and is not blocked from submitting non-combat actions while party members are still fighting off-screen.

#### Acceptance Criteria
- [x] Party members left in an encounter the player escaped continue to take turns and can still be damaged/defeated
- [x] Player can submit normal exploration actions immediately after a successful full escape; submitting another combat action re-engages per existing combat-intent rules
- [x] Encounter only fully resolves (`resolved` phase) per existing end conditions, not merely because the player left
- [x] Tests cover player-escaped-party-still-fighting and the encounter resolving afterward

### 033.7 Exposition feed + HUD flee states

#### Description
Surface flee attempts and outcomes in the renderer, distinguishing all three states: failed attempt (still engaged), successful disengage still pursued, and full escape.

Exposition feed: each state gets distinct, clear copy — a failed attempt should read like a tense near-miss, not a generic narration line; a "still pursued" success should make clear the player isn't safe yet; a full escape should clearly signal combat is over for the player.

Combat HUD (031.9): show a "fleeing" indicator while in `pursued` sub-state; remove the player from the active-combatant HUD once fully escaped, while still showing remaining combatants if party members are still fighting (033.6).

#### Acceptance Criteria
- [x] Exposition feed renders distinct copy for failed/pursued/escaped flee outcomes
- [x] HUD shows a fleeing/pursued indicator distinct from normal turn-order display
- [x] HUD reflects player exit without hiding remaining party-member-vs-hostile combat state
- [x] Component tests cover all three flee states

### 033.8 End-to-end flee smoke test

#### Description
Validate the full flee loop with scripted RNG/provider fixtures.

Scenario minimum:
1. Player engaged in an active encounter attempts to flee with ambiguous-but-recognizable phrasing — DM classifies it as `flee`
2. Scripted losing roll: action consumed, encounter remains `engaged`, hostiles act
3. Scripted winning roll, DM judges "still pursued": encounter remains active, player can attempt again
4. Scripted winning roll, DM judges "escaped": player exits, party members (if present) continue their own turns, encounter does not force-resolve

Deliver:
- `src/db/combatFleeSmoke.test.ts` (or equivalent)
- `docs/runbooks/combat-flee-smoke-test.md`

#### Acceptance Criteria
- [x] Automated test covers failed attempt, successful-but-pursued, and full escape in one encounter
- [x] Rules engine remains authoritative — provider output cannot force a success the engine check didn't produce
- [x] Encounter/party state after a full escape matches 033.6's continuation rules
- [x] `npm test`, `npm run lint`, and `npm run build` pass with the new smoke coverage
