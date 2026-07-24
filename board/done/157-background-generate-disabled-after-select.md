# 157 — Background Generate button disabled after selecting a background

During character creation background selection, choosing a roster background (or a custom one with a label) incorrectly disables the Generate button. Selecting a background should enable Generate so the player can open the story writer modal.

## Acceptance criteria

- [x] After selecting a non-custom background, Generate is enabled (not submitting)
- [x] With no background selected, Generate is disabled
- [x] Custom background: Generate stays disabled until a non-empty custom label is entered
- [x] Unit test covers `canGenerateBackgroundStory` / `generateDisabled` polarity
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
