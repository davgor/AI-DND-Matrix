# 069 — Mundane human race generation

Humans are ordinary people, not a majestic ancestry. Soften how humans are seeded and how campaign lore is prompted so generated world flavor stays commonplace.

Depends on the locked race catalog from **049**. Does not change mechanics or other races' tone.

## Acceptance criteria

- [x] Human roster `seedPrompt` frames humans as ordinary folk (no ambitious / most-widespread / destiny language)
- [x] `buildRaceLorePrompt` for preset `human` instructs the model to keep lore mundane and avoid chosen-people framing
- [x] Other races' lore prompts do not receive the human-only mundane instruction
- [x] Unit tests cover the new seed wording and human-vs-other prompt difference (`roster.test.ts` / `raceLore.test.ts`)
- [x] `npm test`, `npm run lint`, and `npm run build` pass
