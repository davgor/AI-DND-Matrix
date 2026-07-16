# NPC core identity bundle smoke test

Validates epic **052**: gender/class rosters, schema columns, bulk generation, and the two-phase **Generate NPC** path (core bundle → race lore resolution → grounded final backstory).

## Prerequisites

- `npm install`
- Configured LLM provider in `.env` for manual UI steps

## Automated smoke

```bash
npx vitest run src/shared/npcGender/types.test.ts src/shared/npcClass/types.test.ts src/db/migrateNpcGenderClassV33.test.ts src/agents/campaignGeneration/flaggedNpc.test.ts src/agents/campaignGeneration/campaignGeneration.test.ts src/db/npcBackgroundPromotionIntegration.test.ts src/renderer/src/campaignReview/CampaignReviewNpcTraits.test.tsx
```

## Call budget (040.13)

One flagged **Generate NPC** action costs exactly **2** provider calls when the chosen race is already realized in the campaign (core bundle → details) and exactly **3** when it is not (core bundle → race-lore realize → details). Both phases send their JSON contract and static field rules via `GenerateContext.systemPrompt` (module constants in `flaggedNpc.ts`), not per-prompt boilerplate. Bulk generation, additional-region generation, and shortfall top-up stay on the one-shot path (one call per NPC; one call total for an additional region).

Guarded by `generateFlaggedNpc call-count ceilings (040.13)` in `flaggedNpc.test.ts` and `one-shot NPC generation call-count guards (040.13)` in `campaignGeneration.test.ts`. A phase-2 failure after a phase-2-triggered race realize intentionally leaves the `campaign_races` row in place (idempotent — the next NPC of that race skips the lore call).

## Manual smoke (Campaign Review)

1. Run `npm run dev` with a configured provider.
2. Open Campaign Review, pick a region, and **Generate NPC** with a seed like *"an elven ranger who guides travelers"*.
3. Confirm traits show **Gender**, **Class**, and **Background** (if epic 051 landed).
4. Generate a second NPC with the same race — backstory should reuse locked race lore (no duplicate race authoring in the UI flow).
5. Generate a non-speaking creature (e.g. *"a mindless skeleton guard"*) — traits should omit gender/class/background/race.

## Recorded run (template)

| Date | Tester | Result | Notes |
|------|--------|--------|-------|
|      |        |        |       |
