# 094 — Fix CI typecheck regressions

CI `npm run typecheck` fails after speaking-style / play-view work:

1. `makeNpcs` in `campaignGenerationFixtures` widens `temperament` to `string`, so callers that assign to `GeneratedNpc` fail.
2. `CampaignReviewNpcTraits` test helper omitted new `Npc` speaking-style fields.
3. `optimisticSocialMessage.test.ts` accesses `.id` without narrowing a nullable entry.
4. `finalizeTurnSubmission` uses `input.characterId` but its parameter type omitted that field.

## Acceptance criteria

- [x] `makeNpcs` return type is assignable to `GeneratedNpc[]`
- [x] Npc test fixtures / helpers include `speakingStyleSpecimen` / `speakingStyleExamples`
- [x] Optimistic social message test typechecks under strict null checks
- [x] `finalizeTurnSubmission` input type includes `characterId`
- [x] `npm run typecheck` passes
- [x] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
