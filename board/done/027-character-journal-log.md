# EPIC: Character journal log

Add a simple, always-visible scrollable log of major events directly on the character sheet, written in the character's own informal voice — notes a player might jot down themselves ("Finished the job for the miller, was decent to the guy who helped me out, name was Morgan, kind of smelly and weird but alright") — not a combat log, not a mechanical event feed.

The DM agent is the one who writes these entries, via a narration-time proposal, the same way `worldFact`/`storyThreadUpdate` are already emitted in `dm.ts`. This is intentionally simpler and separate from epic 025's log book: the log book is a structured, categorized knowledge reference opened on demand and used to ground the DM against contradiction; this is a lightweight, always-visible diary feed with no categories and no fact-checking role.

Broken down into sub-tickets 027.1-027.4. This epic is done when all of them are.

027.1 character journal DB schema + repository · 027.2 DM narration write path: journal entry proposal · 027.3 journal IPC + character sheet scrollable UI · 027.4 end-to-end journal smoke test

## Sub-tickets

### 027.1 Character journal DB schema + repository

#### Description
Add a simple `character_journal_entries` table scoped to a character (campaign + character id): free-text content, in-game date, created-at — no categories, no structured fields, this is a flat diary feed.

#### Acceptance Criteria
- [x] `character_journal_entries` table stores campaign id, character id, free-text content, in-game date, and created-at timestamp
- [x] Repository functions exist for: create an entry, list a character's entries in reverse-chronological order
- [x] Querying one character's journal never returns another character's entries
- [x] Unit tests cover create/list-ordering and the isolation guarantee

### 027.2 DM narration write path: journal entry proposal

#### Description
Extend the DM agent's narration response schema with an optional journal entry proposal, written in the character's own informal first-person voice, persisted only for genuinely major beats — not every turn, and never combat-blow-by-blow.

#### Acceptance Criteria
- [x] Narration responses can include zero or one proposed journal entry as free text
- [x] The prompt instructs the agent to write in the character's own informal voice (like personal notes), to only propose an entry for a major beat (quest completion, a notable NPC encounter, a significant choice), and never for routine combat actions or minor exchanges
- [x] A proposed entry is persisted against the acting player character and current in-game date automatically — the agent never supplies these
- [x] Unit tests cover persisting a proposed entry and the no-entry-proposed case

### 027.3 Journal IPC + character sheet scrollable UI

#### Description
Add a typed read IPC channel for a character's journal entries, and render them as a simple scrollable, reverse-chronological feed directly on the character sheet (not behind a button/modal) — clearly distinct from the existing inventory section.

#### Acceptance Criteria
- [x] Character sheet shows a scrollable journal feed of entries, most recent first
- [x] An empty journal shows a clean empty state, not an empty gap
- [x] The feed is visually distinct from inventory/stats and from the in-play narration log (`playView`'s DM/player exchange), since it is neither
- [x] IPC channel is preload-exposed the same way other read-only campaign data channels are (e.g. `campaigns:getNarrationLog`)

### 027.4 End-to-end journal smoke test

#### Description
Validate the full journal loop in a real running app: play through a major beat (e.g. completing a quest, a notable NPC encounter) and confirm a character-voiced entry appears on the sheet, while routine/combat turns do not spam new entries.

#### Acceptance Criteria
- [x] Playing through a major story beat results in a new journal entry written in informal first-person voice appearing on the character sheet
- [x] Playing through routine exploration/combat turns does not produce a flood of journal entries
- [x] Restarting the app preserves journal entries and their order
- [x] Opening the character sheet for a character with no journal entries yet shows a clean empty state
