# 076 — Opening scene: enter world on confirm + never recite ability scores

After the player confirms the proposed opening scene (e.g. "works for me"), guided creation should complete and hand off into the campaign play screen. Today the DM may verbally lock the scene while `sceneReady` fails to advance the phase (especially when `proposedOpeningScene` is null on the confirm turn), leaving the player stuck on **Help me set the stage**. Separately, DM replies must not recite raw ability score numbers ("Body 9, Agility 12…") — scores may influence tone and capability, but they belong on the sheet, not in narration.

## Acceptance criteria

- [x] When the opening-scene agent returns `sceneReady: true`, the phase completes even if `proposedOpeningScene` is null — fall back to the already-persisted opening scene text
- [x] Clear player confirmations (e.g. "works for me", "yes", "let us begin") complete the phase even if the model forgets `sceneReady`, when a proposed/persisted scene exists
- [x] Opening-scene turn prompts instruct: on clear player confirmation, set `sceneReady: true` and keep/reuse `proposedOpeningScene`; do not start in-play narration while still negotiating
- [x] Confirming the scene auto-enters play via `guidedCreation.readyToEnterPlay` (wired IPC + preload) after refresh — player lands on the campaign play screen without needing a second "Enter the world" click
- [x] Identity and opening-scene prompts include ability scores as context with an explicit rule: never recite score numbers or labels like "Body 10" in `dmReply` / scene prose
- [x] Unit tests cover sceneReady fallback persistence, confirmation heuristic, prompt language (confirm + no-stat-recite), readyToEnterPlay IPC, and auto-enter-play handoff trigger
- [x] `npm test`, `npm run lint`, and `npm run build` pass
