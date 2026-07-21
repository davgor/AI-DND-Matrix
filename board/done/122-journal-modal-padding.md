# 122 — Journal modal inner padding

The play-sheet Journal modal (`playSheetJournalOverlay`) renders title, close button, and entry text flush against the panel border. Other sheet modals (quest log, spellbook, log book) already use ~20px inner padding.

## Acceptance criteria

- [x] Journal modal panel has visible inner padding so title, close control, and journal content are inset from the border
- [x] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
- [x] `act` workflows `pr-checks.yml` and `deadcode.yml` succeed
