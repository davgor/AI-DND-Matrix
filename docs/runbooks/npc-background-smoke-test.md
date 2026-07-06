# NPC background smoke test

Validates epic **051**: speaking NPCs receive a `backgroundKey` from the shared `BACKGROUND_ROSTER` (epic 050), bulk and single-NPC generation persist it, promotion carries it to `characters.background_key`, and Campaign Review traits show the label.

**Note:** The **Generate NPC** path uses the two-phase flagged pipeline (`generateFlaggedNpc`) with background in the core bundle and final prompt grounding.

## Prerequisites

- `npm install`
- Native module built: `npm run rebuild:node` (runs automatically via `pretest`)
- Configured LLM provider in `.env` for manual UI steps

## Automated smoke

```bash
npx vitest run src/db/migrateNpcBackgroundV32.test.ts src/agents/campaignGeneration/campaignGeneration.test.ts src/main/promotionIpc.test.ts src/renderer/src/campaignReview/CampaignReviewNpcTraits.test.tsx src/db/npcBackgroundIntegration.test.ts src/db/npcBackgroundPromotionIntegration.test.ts
```

Flow covered:

1. Migration v32 adds `npcs.background_key` (nullable, no backfill)
2. Bulk campaign generation prompts include `BACKGROUND_ROSTER`; normalize validates background per `canSpeak`
3. Speaking NPCs persist non-null `backgroundKey`; non-speaking creatures stay `null`
4. **Generate NPC** (single-shot) persists `backgroundKey` from model output
5. `confirmNpcPromotion` copies `backgroundKey` to the new character with `background_story` left null
6. Campaign Review NPC traits show **Background** when set

## Manual smoke (Campaign Review)

1. Run `npm run dev` with a configured provider.
2. Open an existing campaign in **Campaign Review** (or create one with speaking NPCs).
3. Pick a region and use **Generate NPC** with a seed like *"a grizzled war veteran running the tavern"*.
4. After generation, open the new NPC card — traits should include **Background** (e.g. Soldier).
5. Read the backstory — it should plausibly reflect military service given the seed and roster grounding.
6. Promote the NPC to the party — open the new party member's sheet; background label should match (no new story generated).

## Recorded run (template)

| Date | Tester | Result | Notes |
|------|--------|--------|-------|
|      |        |        |       |
