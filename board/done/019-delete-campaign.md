# EPIC: Delete campaign

Add a way for the player to permanently delete a campaign — wiping its full SQLite footprint (regions, region history, NPCs, NPC memories, characters, saves, world facts, story threads, events, sessions) and any uploaded files (portraits, sheet backgrounds) on disk, not just removing it from the sidebar list.

Broken down into sub-tickets 019.1-019.6. This epic is done when all of them are.

019.1 delete entry point + confirmation UI · 019.2 delete-campaign IPC contract · 019.3 DB cascade delete (all campaign-scoped tables) · 019.4 delete associated uploaded files · 019.5 post-delete UI state handling · 019.6 delete-campaign smoke test (dev + packaged)

## Sub-tickets

### 019.1 Delete entry point + confirmation UI

#### Description
Add a delete action for a campaign (e.g. on its sidebar entry) that opens a confirmation prompt naming the campaign and warning the action is permanent before anything is deleted.

#### Acceptance Criteria
- [x] Each campaign in the sidebar list has a delete action that does not trigger on accidental single click (e.g. requires an explicit menu/button, not the row-select click)
- [x] Activating delete opens a confirmation prompt naming the campaign and stating the action is permanent and cannot be undone
- [x] Dismissing/canceling the prompt leaves the campaign and all its data untouched
- [x] UI test verifies the entry point opens the prompt and cancel leaves state unchanged

### 019.2 Delete-campaign IPC contract

#### Description
Add a typed `campaigns:delete` IPC channel (preload-exposed, narrow, no generic exec/SQL surface) that the confirmation UI from 019.1 calls on confirm, returning a typed success/failure result.

#### Acceptance Criteria
- [x] A typed `campaigns:delete(campaignId)` IPC channel exists, exposed through preload the same way other campaign channels are
- [x] Main-process handler validates the campaign exists before attempting deletion and returns a typed not-found error if it doesn't
- [x] Handler returns a typed success result on completion and a typed failure result (not an uncaught exception) if deletion fails partway through
- [x] Unit tests cover the success path and the not-found/failure paths

### 019.3 DB cascade delete (all campaign-scoped tables)

#### Description
Implement a repository function that deletes a campaign and every row that traces back to it — `regions` (and their `region_history`), `npcs` (and their `npc_memories`), `characters`, `saves`, `world_facts`, `story_threads`, `events`, and `sessions` — inside a single transaction, so a failure partway through never leaves an orphaned partial campaign.

#### Acceptance Criteria
- [x] Deleting a campaign removes its `campaigns` row and every row in `regions`, `region_history`, `npcs`, `npc_memories`, `characters`, `saves`, `world_facts`, `story_threads`, `events`, and `sessions` that belongs to it
- [x] Deletion runs inside a single DB transaction; a failure partway through leaves the campaign's data exactly as it was before (no partial delete)
- [x] Deleting one campaign never removes or affects another campaign's rows
- [x] Unit tests verify full row removal across every listed table and verify transactional rollback on a forced mid-delete failure

### 019.4 Delete associated uploaded files

#### Description
Delete the uploaded portrait and sheet-background image files (copied into app data by `fileUploadIpc.ts`) for every character belonging to a deleted campaign, so disk usage doesn't grow unbounded from orphaned images after deletion.

#### Acceptance Criteria
- [x] Deleting a campaign removes every character portrait and sheet-background file it owns from app-data storage
- [x] A missing/already-removed file during cleanup does not abort or fail the overall campaign deletion
- [x] Files belonging to other campaigns' characters are never touched
- [x] Unit tests verify file cleanup is attempted for each owned file path and that a missing-file error is tolerated

### 019.5 Post-delete UI state handling

#### Description
Update the renderer after a successful delete so the campaign disappears from the sidebar immediately and, if it was the currently open/active campaign, the app navigates away to a safe default view instead of continuing to reference deleted state.

#### Acceptance Criteria
- [x] On successful delete, the campaign is removed from the sidebar list without requiring a manual refresh
- [x] If the deleted campaign was the active/open one, the app navigates to the main/no-campaign-selected view rather than continuing to render stale data
- [x] A failed delete leaves the campaign visible in the sidebar and shows an actionable error
- [x] UI test verifies list update and active-campaign navigation behavior on successful delete

### 019.6 Delete-campaign smoke test (dev + packaged)

#### Description
Validate end-to-end campaign deletion against a real campaign with a full data footprint (regions, NPCs with memories, characters with uploaded images, saves, events) in both dev and packaged builds.

#### Acceptance Criteria
- [x] Dev-mode smoke: generate a campaign, play enough to populate regions/NPCs/memories/saves/events and upload a character portrait, delete it, and confirm every related DB row and uploaded file is gone
- [x] Dev-mode smoke confirms other existing campaigns and their data are untouched by the deletion
- [x] Packaged-mode smoke confirms the same delete flow succeeds in a production build
- [x] Smoke runbook documents steps and observed outcomes
