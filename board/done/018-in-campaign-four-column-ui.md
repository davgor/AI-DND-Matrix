# EPIC: In-campaign four-column UI layout

Define and implement the in-campaign mode UI as a maximum four-column layout:
- column 1: campaigns rail (collapsible)
- column 2: DM exposition column (scene stage and updates)
- column 3: player interaction column
- column 4: player sheet rail (collapsible)

Broken down into sub-tickets 018.1-018.10. This epic is done when all of them are.

018.1 in-campaign layout shell and column contract · 018.2 column 1 campaigns rail render + selection · 018.3 column 1 campaigns rail collapse + persistence · 018.4 column 2 DM exposition panel structure · 018.5 column 2 scene refresh/update UX · 018.6 column 3 player interaction panel · 018.7 column 4 player sheet rail render · 018.8 column 4 player sheet collapse + persistence · 018.9 responsive breakpoints and fallback layout rules · 018.10 in-campaign four-column smoke test

## Sub-tickets

### 018.1 In-campaign layout shell and column contract

#### Description
Create a typed layout contract for in-campaign mode with a maximum four-column grid and deterministic region assignments.

#### Acceptance Criteria
- [x] Layout defines fixed semantic regions for campaigns, DM exposition, player interaction, and player sheet
- [x] Desktop view supports up to four visible columns simultaneously
- [x] Column width rules/minimums are defined to prevent overlap or clipping
- [x] Unit/UI test verifies base shell renders all required regions

### 018.2 Column 1 campaigns rail render + selection

#### Description
Render campaign list in column 1 during in-campaign mode with current campaign visibility and switching behavior.

#### Acceptance Criteria
- [x] Column 1 displays campaign list with current active campaign clearly indicated
- [x] Selecting another campaign triggers existing campaign switch flow safely
- [x] List ordering and metadata behavior remain consistent with existing sidebar conventions
- [x] UI test verifies campaign select behavior from column 1

### 018.3 Column 1 campaigns rail collapse + persistence

#### Description
Add collapse/expand behavior to column 1 campaigns rail and persist the state across restarts.

#### Acceptance Criteria
- [x] Column 1 has explicit collapse/expand control
- [x] Collapsed and expanded states are visually distinct and reversible
- [x] Collapse state persists across app restart
- [x] Collapsed state preserves access to campaign switching affordance (icon or quick-open path)

### 018.4 Column 2 DM exposition panel structure

#### Description
Implement the DM exposition column structure where current scene context and stage-setting narration are presented.

#### Acceptance Criteria
- [x] Column 2 has clear DM exposition header/state region and scrollable content feed
- [x] Current scene/stage context is visually emphasized
- [x] Exposition content rendering handles short and long scene text safely
- [x] UI test verifies core rendering states for empty/active exposition

### 018.5 Column 2 scene refresh/update UX

#### Description
Support DM exposition refresh/update behavior so scene-setting content can update as turns/actions resolve.

#### Acceptance Criteria
- [x] Column 2 updates when new narration/stage-setting content is produced
- [x] Refresh/loading state is visible while waiting for updated exposition
- [x] Failed exposition refresh displays actionable error without breaking other columns
- [x] Update flow is tested for success and failure paths

### 018.6 Column 3 player interaction panel

#### Description
Implement the primary player interaction column for input, actions, and interaction log within in-campaign mode.

#### Acceptance Criteria
- [x] Column 3 includes player input area and interaction/action history region
- [x] Input controls remain enabled/disabled according to existing turn processing state rules
- [x] Interaction log updates in real time with submitted player actions and outcomes
- [x] UI test verifies input-submit-update cycle in column 3

### 018.7 Column 4 player sheet rail render

#### Description
Render the player sheet as the right-side rail in in-campaign mode with key character state visibility.

#### Acceptance Criteria
- [x] Column 4 displays core character sheet elements (stats, HP, inventory, currency, and portrait/background when available)
- [x] Player sheet data remains synchronized with active campaign character state
- [x] Rail can render compact and expanded visual states without layout breakage
- [x] UI test verifies player sheet rail rendering in active campaign mode

### 018.8 Column 4 player sheet collapse + persistence

#### Description
Add collapse/expand controls for the player sheet rail and persist chosen state across app restarts.

#### Acceptance Criteria
- [x] Column 4 has explicit collapse/expand control independent of column 1
- [x] Collapse state persists across app restarts
- [x] Expanding rail restores prior content state without requiring full reload
- [x] UI test verifies collapse persistence and restore behavior

### 018.9 Responsive breakpoints and fallback layout rules

#### Description
Define how the four-column layout adapts as width decreases so in-campaign mode remains usable on smaller windows.

#### Acceptance Criteria
- [x] Breakpoints define when columns collapse, stack, or become overlay panels
- [x] Core gameplay flow remains usable when fewer than four columns are visible
- [x] No column content becomes unreachable due to responsive transitions
- [x] UI test coverage includes at least desktop four-column and narrowed fallback states

### 018.10 In-campaign four-column smoke test

#### Description
Validate end-to-end in-campaign layout behavior including collapsible side rails and live content updates.

#### Acceptance Criteria
- [x] Smoke run verifies desktop four-column layout with all columns active
- [x] Smoke run verifies column 1 and column 4 collapse/expand + persistence behavior
- [x] Smoke run verifies DM exposition updates and player interaction flow in columns 2 and 3
- [x] Smoke runbook documents window sizes, steps, and observed outcomes
