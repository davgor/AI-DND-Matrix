# NPC core identity bundle smoke test

Validates epic **052**: gender/class rosters, schema columns, bulk generation, and the two-phase **Generate NPC** path (core bundle → race lore resolution → grounded final backstory).

## Prerequisites

- `npm install`
- Configured LLM provider in `.env` for manual UI steps

## Automated smoke

```bash
npx vitest run src/shared/npcGender/types.test.ts src/shared/npcClass/types.test.ts src/db/migrateNpcGenderClassV33.test.ts src/agents/campaignGeneration/flaggedNpc.test.ts src/agents/campaignGeneration/campaignGeneration.test.ts src/db/npcBackgroundPromotionIntegration.test.ts src/renderer/src/campaignReview/CampaignReviewNpcTraits.test.tsx
```

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
