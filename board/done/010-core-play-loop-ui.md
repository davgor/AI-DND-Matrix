# EPIC: Core play loop UI

Broken down into sub-tickets 010.1-010.10. This epic is done when all of them are.

010.1 play view layout · 010.2 turn loop + auto-save · 010.3 roll-visibility toggle · 010.4 character sheet panel · 010.5 rest action UI · 010.6 travel action UI · 010.7 Standard-death revert UX · 010.8 AI party autonomous rendering · 010.9 restart continuity · 010.10 session recap

## Sub-tickets

### 010.1 Play view layout

#### Description
Build the side-by-side play view layout: DM narration panel and player speech/action panel with input box.

#### Acceptance Criteria
- [x] DM narration feed and player speech/action log + input box render side by side
- [x] Layout is responsive to window resizing without breaking

### 010.2 Turn loop wiring + auto-save snapshot

#### Description
Wire the full turn loop: player input -> DM intent interpretation -> engine resolution -> DM narration + NPC reactions -> re-render -> persist, including an auto-save snapshot after every resolved action.

#### Acceptance Criteria
- [x] Submitting free-text input runs the full loop end-to-end and renders the DM's narration plus any NPC reactions
- [x] A new `saves` snapshot is written before the response is shown to the player

### 010.3 Roll-visibility toggle

#### Description
Implement the settings toggle between showing the engine's actual roll/DC inline and a narration-only view.

#### Acceptance Criteria
- [x] "Show rolls" mode displays the roll/DC inline with narration
- [x] "Narration only" mode hides it
- [x] The setting persists across app restarts

### 010.4 Expandable character sheet panel

#### Description
Build the right-side expandable character sheet panel showing stats/HP/inventory/currency and the uploaded portrait/background.

#### Acceptance Criteria
- [x] Panel slides in from the right on demand and back out on dismiss
- [x] Shows current stats, HP, inventory, and currency
- [x] Renders the uploaded portrait and sheet-background images when set

### 010.5 Rest action UI wiring

#### Description
Wire a typed rest action (e.g. "I make camp") to the engine's rest resolution.

#### Acceptance Criteria
- [x] Typing a rest action triggers short or long rest resolution appropriately and visibly updates HP
- [x] A long rest visibly advances the in-game date

### 010.6 Travel action UI wiring

#### Description
Wire a typed travel action between regions to the engine's travel-time resolution.

#### Acceptance Criteria
- [x] Typing a travel action advances the in-game date by the engine-clamped estimate
- [x] The narration mentions the time that passed

### 010.7 Standard-death auto-revert UX

#### Description
Build the UX for Standard death mode's automatic snapshot revert when a dying-save sequence is lost.

#### Acceptance Criteria
- [x] Losing the dying-save sequence under Standard mode automatically reverts to the pre-death snapshot and resumes play with no separate player save/load step
- [x] The player sees a clear message explaining what happened (reverted to before the fatal moment)

### 010.8 AI party member autonomous turn rendering

#### Description
Render AI party members' automatic actions each round/scene without requiring player input to direct them.

#### Acceptance Criteria
- [x] During a scene/combat round, each AI party member's action is generated and rendered without the player issuing a command for it
- [x] Party member actions appear clearly attributed to that character in the narration log

### 010.9 App restart continuity

#### Description
Confirm closing and reopening the app restores the same play state exactly as left.

#### Acceptance Criteria
- [x] After closing and reopening, narration history, character stats, and world state match exactly what was left before closing
- [x] Verified by an integration test or manual repro: play a few turns, close, reopen, compare state

### 010.10 Session recap on reopen

#### Description
Offer an optional DM-narrated recap when reopening a campaign from the sidebar.

#### Acceptance Criteria
- [x] Reopening a campaign offers a "previously on..." recap option built from recent events
- [x] Choosing to skip it goes straight to the play view
