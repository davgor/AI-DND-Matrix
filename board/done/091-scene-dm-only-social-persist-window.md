# 091 — Scene is DM-only; Social persists player lines with a 100-message window

Scene (DM) should only show DM flavor/narration — never the player’s own words or action-expression restatements. Player text belongs in Social and must remain after turn resolve. Social only mounts a sliding window of recent messages (default 100) and loads older chunks when the user scrolls up, so a long campaign does not keep the full chat DOM in memory.

Depends on / related: **085** (Social stream), **087** (player utterance projection), **088** (utterance persistence).

## Acceptance criteria

- [x] `filterDmExpositionEntries` keeps only `speaker === 'dm'` lines; player `actionExpression` lines (including “X says …”) no longer appear in Scene
- [x] `filterSocialEntries` still surfaces player raw lines (and NPC/party dialogue); player utterances remain after refresh (optimistic merge → persisted log)
- [x] Social render window shows at most the newest **100** messages; scrolling near the top streams in the previous 100-message page
- [x] Unit tests cover the filter split and social window helpers
- [x] `PLAY_VIEW_UX_SPEC` documents DM-only Scene + Social windowing
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
