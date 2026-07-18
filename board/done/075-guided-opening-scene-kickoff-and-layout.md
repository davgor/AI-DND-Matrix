# 075 — Guided opening scene: DM kickoff + full-width layout

On **Help me set the stage**, the conversation shell shrink-wraps to a narrow left column instead of filling the onboarding content area. The DM also never speaks first — the thread stays on "Waiting for the DM…" until the player types. Opening scene should mirror identity: on enter, the DM proposes a starting scene and asks if it looks good; confirmation advances (`sceneReady`), otherwise the DM and player negotiate.

## Acceptance criteria

- [x] `.guided-opening-scene-stage` (and the conversation shell) stretch to fill the remaining `app-body` width/height beside the sidebar — not a shrink-wrapped left column
- [x] Entering opening-scene phase with an empty transcript auto-kickoffs a DM message that proposes a concrete opening scene and asks the player to confirm (e.g. "Does this look good to you?")
- [x] Kickoff persists `proposedOpeningScene` with `sceneReady: false`; a later player confirmation can set `sceneReady: true` and complete the phase (existing send-message path)
- [x] Opening-scene turn prompts instruct: confirm → `sceneReady` true; decline/change → revise and re-ask, do not mark ready
- [x] Unit tests cover kickoff happy path + idempotency, kickoff prompt language, confirm/negotiate prompt language, and layout CSS class presence on the stage wrapper
- [x] `npm test`, `npm run lint`, and `npm run build` pass
