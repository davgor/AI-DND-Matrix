# EPIC: Delete campaign

Add a way for the player to permanently delete a campaign — wiping its full SQLite footprint (regions, region history, NPCs, NPC memories, characters, saves, world facts, story threads, events, sessions) and any uploaded files (portraits, sheet backgrounds) on disk, not just removing it from the sidebar list.

Broken down into sub-tickets 019.1-019.6. This epic is done when all of them are.

019.1 delete entry point + confirmation UI · 019.2 delete-campaign IPC contract · 019.3 DB cascade delete (all campaign-scoped tables) · 019.4 delete associated uploaded files · 019.5 post-delete UI state handling · 019.6 delete-campaign smoke test (dev + packaged)
