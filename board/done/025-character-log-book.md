# EPIC: Character log book

Add a player-facing knowledge log, opened from the character sheet, covering five categories: Events, Places, People, Bestiary, and Things. This is the character's own subjective knowledge (what they've personally experienced or heard of), distinct from the existing omniscient `world_facts`/`npc_memories`/`region_history` tables that already ground the DM/NPC agents.

The DM agent gets read access to a character's log book as part of its normal re-grounded-from-SQLite context on every narration call (same principle already used for region/story-thread state), with an explicit instruction not to contradict what's already recorded there, and a write path to add new entries when narration reveals something log-worthy — mirroring the existing `worldFact`/`storyThreadUpdate` emission pattern in `dm.ts`. Note: this re-grounds the agent against real data rather than chat history, which is this project's existing consistency mechanism — it is not a separate deterministic contradiction-detector, since judging whether two sentences semantically contradict each other isn't something the rules engine can decide; that stays an LLM judgment call, just one now grounded in the right data.

Broken down into sub-tickets 025.1-025.6. This epic is done when all of them are.

025.1 log book DB schema + repository · 025.2 log book IPC + character sheet modal UI · 025.3 DM narration write path: log book entry proposals · 025.4 DM narration read path: log book grounding context · 025.5 per-category context windowing · 025.6 end-to-end log book smoke test
