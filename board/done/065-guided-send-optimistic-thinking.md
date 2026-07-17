# 065 — Guided DM send: optimistic message + thinking indicator

When the player presses Send in guided creation, the reply should appear in the conversation thread immediately (input cleared), and a cycling “The DM is thinking” status should show that the turn was accepted while the DM response is in flight.

## Acceptance criteria

- [x] Pressing Send clears the composer and appends the player message to the thread before the IPC/LLM round-trip completes (verified via `executeGuidedSend.test.ts`)
- [x] While waiting (send or identity kickoff), the thread shows “The DM is thinking” with cycling ellipses `.` → `..` → `...` → `....` → repeat (unit-tested `dmThinkingStatusLabel`)
- [x] On send failure, the composer is restored with the unsent text and the optimistic player bubble is removed
- [x] Unit tests cover ellipsis cycling and optimistic pending-message merge; `npm test`, `npm run lint`, and `npm run build` pass
