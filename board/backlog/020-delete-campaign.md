# EPIC: Delete campaign

Add a way for the player to permanently delete a campaign — wiping its full SQLite footprint (regions, region history, NPCs, NPC memories, characters, saves, world facts, story threads, events, sessions) and any uploaded files (portraits, sheet backgrounds) on disk, not just removing it from the sidebar list.

Broken down into sub-tickets 020.1-020.6. This epic is done when all of them are.

020.1 delete entry point + confirmation UI · 020.2 delete-campaign IPC contract · 020.3 DB cascade delete (all campaign-scoped tables) · 020.4 delete associated uploaded files · 020.5 post-delete UI state handling · 020.6 delete-campaign smoke test (dev + packaged)
