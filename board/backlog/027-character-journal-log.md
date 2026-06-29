# EPIC: Character journal log

Add a simple, always-visible scrollable log of major events directly on the character sheet, written in the character's own informal voice — notes a player might jot down themselves ("Finished the job for the miller, was decent to the guy who helped me out, name was Morgan, kind of smelly and weird but alright") — not a combat log, not a mechanical event feed.

The DM agent is the one who writes these entries, via a narration-time proposal, the same way `worldFact`/`storyThreadUpdate` are already emitted in `dm.ts`. This is intentionally simpler and separate from epic 025's log book: the log book is a structured, categorized knowledge reference opened on demand and used to ground the DM against contradiction; this is a lightweight, always-visible diary feed with no categories and no fact-checking role.

Broken down into sub-tickets 027.1-027.4. This epic is done when all of them are.

027.1 character journal DB schema + repository · 027.2 DM narration write path: journal entry proposal · 027.3 journal IPC + character sheet scrollable UI · 027.4 end-to-end journal smoke test
