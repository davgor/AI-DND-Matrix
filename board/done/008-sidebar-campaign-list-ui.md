# EPIC: Sidebar + campaign list UI

Broken down into sub-tickets 008.1-008.5. This epic is done when all of them are.

008.1 sidebar list UI · 008.2 collapse/expand · 008.3 switch + last_played_at · 008.4 new-campaign entry point · 008.5 multi-campaign isolation

## Sub-tickets

### 008.1 Sidebar campaign list UI

#### Description
Render the list of campaigns in the sidebar with name and last-played date, ordered by most recently played.

#### Acceptance Criteria
- [x] Sidebar lists all campaigns from the DB with name and last-played date
- [x] List order is most-recently-played first

### 008.2 Sidebar collapse/expand

#### Description
Allow the sidebar to be collapsed and expanded, with the state persisting across app restarts.

#### Acceptance Criteria
- [x] A toggle collapses/expands the sidebar
- [x] The collapsed/expanded state persists across an app restart (e.g. stored in local app config)

### 008.3 Campaign switch wiring + last_played_at update

#### Description
Clicking a campaign entry switches the main panel to that campaign and updates its `sessions.last_played_at`.

#### Acceptance Criteria
- [x] Clicking a campaign entry renders that campaign's view in the main panel
- [x] `sessions.last_played_at` is updated on switch and the sidebar ordering reflects it on next render

### 008.4 "New campaign" entry point

#### Description
Add a sidebar entry point that starts the campaign-generation flow.

#### Acceptance Criteria
- [x] A visible "new campaign" control in the sidebar starts the flow from ticket 007.1
- [x] After generation completes, the new campaign appears in the sidebar list

### 008.5 Multi-campaign isolation

#### Description
Confirm switching between two campaigns shows correct, distinct data for each with no state leaking between them.

#### Acceptance Criteria
- [x] Creating a second campaign and switching between both shows each one's own regions/characters/narration, never mixed
- [x] Manually tested (or covered by an integration test) by creating two campaigns with distinct data and switching back and forth
