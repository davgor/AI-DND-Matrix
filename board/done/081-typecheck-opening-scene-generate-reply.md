# 081 — Fix typecheck: opening-scene generate-reply context call

`npm run typecheck` fails: `guidedCreationGenerateReply.ts` passes `phase`/`message` into `buildOpeningSceneAgentContext`, whose input type is only `{ campaignId; characterId }`.

## Acceptance criteria

- [x] `buildOpeningScenePlayerReplyInput` calls `buildOpeningSceneAgentContext` with only `campaignId` + `characterId`
- [x] `npm run typecheck` exits 0
- [x] `npm test`, `npm run lint`, and `npm run build` pass
