# Ask the DM (OOC) smoke test

Manual verification for epic **106** after automated ask-DM tests pass.

## Prerequisites

- Dev build: `npm run dev`
- An in-progress campaign with a playable character
- Claude or Player2 provider configured

## Steps

1. **Enter play** — Open the campaign and enter the play view (exploration or combat is fine).
2. **Journal tab** — Open the play sheet **Journal** tab.
3. **Ask the DM** — Confirm **Ask the DM** sits **directly under** **Open spellbook**. Click it.
4. **OOC panel** — Modal opens with **Out of character** labeling, empty transcript hint, and composer.
5. **Send OOC** — Ask a rules or reminder question (e.g. “Remind me how advantage works”). Confirm a DM facilitator reply appears (not in-character scene narration).
6. **No fiction advance** — Confirm Scene and Social columns did not gain new lines from that send; if combat was active, the round did not advance from the OOC send alone.
7. **Dismiss** — Close via ×, Escape, or backdrop; reopen Ask the DM and confirm history is still there.
8. **Reopen campaign** — Return to hub / close the campaign, re-enter play as the same character, open Ask the DM again — prior OOC messages remain.

## Expected

- Social **Act** still uses the turn pipeline; Ask the DM never triggers `turn:resolve`.
- OOC history is per character (switching characters shows that character’s thread).
- Level-up / obituary modals still stack above Ask the DM if both appear.

## Automated

```bash
npx vitest run src/db/repositories/askDmMessages.test.ts src/main/askDmIpc.test.ts src/agents/askDm.test.ts src/renderer/src/playView/AskDmModal.test.tsx src/renderer/src/playView/PlaySheetJournalTab.test.tsx src/db/schema.test.ts
```
