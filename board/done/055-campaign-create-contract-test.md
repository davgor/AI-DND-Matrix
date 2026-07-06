# 055 — Campaign create contract test

Intermittent "invalid campaign" failures on real LLM create (default 2 regions / 3 NPCs).

## Acceptance criteria

- [x] Contract test locks default setup-form create path (2 regions, 3 NPCs, standard death)
- [x] Contract test covers realistic LLM shapes (snake_case, field aliases, single-newline world prose)
- [x] NPC slot generation retries on rejected single-NPC responses
- [x] `npm test`, `npm run lint`, `npm run build` pass
