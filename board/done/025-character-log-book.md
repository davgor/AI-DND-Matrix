# EPIC: Character log book

Add a player-facing knowledge log, opened from the character sheet, covering five categories: Events, Places, People, Bestiary, and Things. This is the character's own subjective knowledge (what they've personally experienced or heard of), distinct from the existing omniscient `world_facts`/`npc_memories`/`region_history` tables that already ground the DM/NPC agents.

The DM agent gets read access to a character's log book as part of its normal re-grounded-from-SQLite context on every narration call (same principle already used for region/story-thread state), with an explicit instruction not to contradict what's already recorded there, and a write path to add new entries when narration reveals something log-worthy — mirroring the existing `worldFact`/`storyThreadUpdate` emission pattern in `dm.ts`. Note: this re-grounds the agent against real data rather than chat history, which is this project's existing consistency mechanism — it is not a separate deterministic contradiction-detector, since judging whether two sentences semantically contradict each other isn't something the rules engine can decide; that stays an LLM judgment call, just one now grounded in the right data.

Broken down into sub-tickets 025.1-025.6. This epic is done when all of them are.

025.1 log book DB schema + repository · 025.2 log book IPC + character sheet modal UI · 025.3 DM narration write path: log book entry proposals · 025.4 DM narration read path: log book grounding context · 025.5 per-category context windowing · 025.6 end-to-end log book smoke test

## Sub-tickets

### 025.1 Log book DB schema + repository

#### Description
Add a `log_entries` table scoped to a character (campaign + character id), with a category enum (`event`/`place`/`person`/`beast`/`thing`), title, content, an optional loose reference to the related entity (NPC/region/item, not FK-enforced since it varies by category), and the in-game date it was learned.

#### Acceptance Criteria
- [x] `log_entries` table stores campaign id, character id, category (constrained to the five valid values), title, content, optional related-entity id, in-game date learned, and created-at timestamp
- [x] Repository functions exist for: create an entry, list entries for a character, list entries for a character filtered by category
- [x] Querying one character's log entries never returns another character's entries (isolation), mirroring the existing `npc_memories` isolation guarantee
- [x] Unit tests cover create/list/filter-by-category and the isolation guarantee

### 025.2 Log book IPC + character sheet modal UI

#### Description
Add a typed read IPC channel for a character's log entries, and a "Log Book" button on the character sheet that opens a modal listing entries grouped into the five categories (Events, Places, People, Bestiary, Things).

#### Acceptance Criteria
- [x] Character sheet has a visible "Log Book" action that opens a modal without affecting campaign/session state
- [x] Modal shows all five categories as distinct sections, each listing that character's entries (title + content + when learned)
- [x] A category with no entries yet shows an empty state rather than an empty gap
- [x] Closing the modal returns cleanly to the character sheet
- [x] IPC channel is preload-exposed the same way other read-only campaign data channels are (e.g. `campaigns:getNarrationLog`)

### 025.3 DM narration write path: log book entry proposals

#### Description
Extend the DM agent's narration response schema (`NarrationResult` in `dm.ts`) with an optional list of log book entry proposals (category, title, content), persisted the same way `worldFact`/`storyThreadUpdate` already are in `persistNarrationSideEffects`.

#### Acceptance Criteria
- [x] Narration responses can include zero or more proposed log entries, each with a category restricted to the five valid values, a title, and content
- [x] An entry with an invalid/unrecognized category is dropped rather than persisted or crashing the turn
- [x] Persisted entries are attached to the acting player character and the current campaign/in-game date automatically — the agent never supplies these
- [x] Unit tests cover persisting a valid multi-category batch and dropping an invalid-category entry

### 025.4 DM narration read path: log book grounding context

#### Description
Extend `assembleNarrationContext`/`buildNarrationPrompt` so every narration call includes the acting character's current log book entries, with an explicit instruction that the response must not contradict what's already recorded — the same re-ground-from-SQLite principle already used for region/story-thread state, applied to the player's own knowledge log.

#### Acceptance Criteria
- [x] `NarrationContext` includes the acting character's log book entries (re-read from SQLite, never carried over from prior turns/chat history)
- [x] The narration prompt explicitly presents these entries as established facts the response must remain consistent with
- [x] Context assembly works correctly for a character with zero log entries yet (no error, just an empty/absent section in the prompt)
- [x] Unit tests verify the assembled context includes the right character's entries and excludes others'

### 025.5 Per-category context windowing

#### Description
Bound how many log entries per category are injected into the narration prompt as a campaign's log book grows, mirroring the existing recency-window (`takeRecent`) and region-history-compression concerns used elsewhere in this codebase — a long campaign must not blow up prompt size just because the log book has accumulated hundreds of entries.

#### Acceptance Criteria
- [x] Each category contributes only a bounded, most-relevant slice of entries to the narration prompt, not the full history
- [x] Entries most relevant to the current scene (e.g. matching the present region or present NPCs) are prioritized over older unrelated entries when the bound is exceeded
- [x] The bound is a named constant, not a magic number scattered inline
- [x] Unit tests verify the bound is respected and that relevant entries are preferred over irrelevant older ones when both exist

### 025.6 End-to-end log book smoke test

#### Description
Validate the full log book loop in a real running app: play through narration that adds entries across multiple categories, confirm they appear correctly in the modal, and confirm a later narration call stays consistent with an established fact (e.g. an NPC's name/role recorded earlier) rather than contradicting it.

#### Acceptance Criteria
- [x] Playing through narration that introduces a new place, person, and event results in correctly categorized entries appearing in the log book modal
- [x] Restarting the app preserves all log book entries
- [x] A later DM narration call referencing a previously-logged person/place remains consistent with the recorded entry rather than contradicting it
- [x] Opening the log book for a character with no entries yet shows clean empty states, not errors
