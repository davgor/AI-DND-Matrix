# Character background smoke test

Validates epic **050**: preseeded background roster, onboarding background step between race and equipment, AI story generation, identity/opening-scene context threading, and character sheet display.

## Prerequisites

- `npm install`
- Native module built: `npm run rebuild:node` (runs automatically via `pretest`)
- Configured LLM provider in `.env` for manual UI steps

## Automated smoke

```bash
npx vitest run src/shared/characterBackground/types.test.ts src/engine/characterBackground/roster.test.ts src/agents/backgroundStory.test.ts src/db/migrateCharacterBackgroundCharactersV31.test.ts src/main/backgroundIpc.generate.test.ts src/main/backgroundIpc.apply.test.ts src/shared/guidedCreation/stageRouting.test.ts src/renderer/src/backgroundSelection/backgroundSelection.test.tsx src/agents/guidedIdentity.test.ts src/agents/guidedOpeningScene.test.ts src/renderer/src/characterSheet/CharacterSheetBackgroundLine.test.tsx src/db/characterBackgroundIntegration.test.ts
```

Flow covered:

1. Preseeded `BACKGROUND_ROSTER` (17 entries including `isekaid`) with parse helpers
2. Migration v31 adds `background` phase and `background_key` / `background_story` columns
3. `race:apply` advances to `background`; `background:apply` advances to `equipment`
4. `background:generateStory` produces prose with optional player prompt in the assembled LLM prompt
5. Stage routing maps `background` → `backgroundSelection` and resumes after reload
6. Identity kickoff and opening-scene prompts include background label, description, and untrusted story
7. Character sheet shows background label; missing background omits the line gracefully

## Manual smoke (full app + UI)

1. Run `npm run dev` with a configured provider.
2. Create a campaign and complete mechanical character setup. Confirm race, then land on **Choose your background**.
3. Pick **Soldier** from the dropdown — read-only description populates with roster text (no LLM).
4. **Custom (126.5)** — Select **Custom**, enter a required label (e.g. River Smuggler), generate/edit story, proceed. Confirm identity/opening prompts use the custom label.
5. Click **Generate**, enter an optional guidance prompt, confirm — story textarea fills and remains editable.
6. Open **Generate** again with an empty modal prompt — a new story still generates.
7. Hand-edit the story, then **Choose your gear**.
8. On equipment, click **Back** — you should return to background selection, not race.
9. Complete equipment → guided identity — the DM should reference your background rather than asking what you did before from scratch.
10. Restart the app while still in `background` phase (before confirming) — you should resume on the background page.

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| | vitest | | |
| | manual | | |
