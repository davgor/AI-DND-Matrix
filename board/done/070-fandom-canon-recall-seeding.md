# 070 — Fandom canon-recall seeding

When a campaign premise references a known setting (fandom / published world), seed regions and NPCs from recognizable places and characters instead of inventing generic ones. Example: “world of the shield hero” should prefer Melromarc as a region and Raphtalia as an NPC when the model knows that setting.

Adds a **canon-recall** stage after world generation and before regions/NPCs. The model lists known places and characters for the premise (empty lists when unrecognized). Later stages prefer that list and invent only to fill remaining slots.

Touches the campaign create pipeline — follow `docs/runbooks/campaign-create-change-checklist.md`.

## Acceptance criteria

- [x] New `canon` create stage runs after `world` and before `regions` (`CREATE_CAMPAIGN_STAGE_ORDER` + progress messages)
- [x] `buildCanonRecallPrompt` / `normalizeCanonRecall` produce `knownPlaces` + `knownCharacters` (empty when setting unknown); unit tests cover normalize + prompt text
- [x] Regions and single-NPC prompts receive canon context and instruct preferring listed names before inventing
- [x] Seed orchestration threads canon into region/NPC generation; progress reports include `canon`
- [x] Cascading seed fixtures include a canon response so scripted providers stay in sync
- [x] Contract test (`campaignCreateIpc.contract.test.ts`) still passes with updated fixtures
- [x] Unit test: fandom-shaped premise + scripted canon (Melromarc / Raphtalia) yields those names in regions/NPCs
- [x] `npm test`, `npm run lint`, and `npm run build` pass
