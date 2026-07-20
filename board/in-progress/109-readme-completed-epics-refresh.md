# 109 — Refresh README from completed epics

The repo README still says the product shipped through epic **039** and lists **046** (spellbook) as in progress. Board `/done` now includes epics through **108**. Bring Status, Roadmap, and related body sections in line with shipped work and the current backlog.

## Acceptance criteria

- [x] README Status reflects shipped work through the latest completed epic range (040–108), not “through 039”
- [x] Roadmap Completed table includes thematic rows for 040+; 046 is no longer listed under In progress
- [x] Active backlog / revisit / moonshots match `board/` (020, 083, 105, 106; 021; m001–m004)
- [x] Body sections (intro, Core Design, Rules Engine, Persistence, Architecture, Tech Stack) mention major shipped features from completed epics where the old text was stale
- [ ] Ticket moved to `board/done/` when the above is verified
