# 087 — Player messages appear in Social stream

Bugfix on **085**: typed player input is stored on `player_action_expression` events but never projected into the play log, so Social stays empty for most turns. Project raw player lines into Social (chat-style, oldest→newest) and show them immediately on send.

## Acceptance criteria

- [x] `player_action_expression` events with `playerInput` emit a raw player log entry (Social) plus the action-expression entry (Scene)
- [x] Submitting an action optimistically appends the typed line to Social before the turn resolves; refresh replaces it with the persisted log
- [x] Unit tests cover narration-log projection and optimistic append helper
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
