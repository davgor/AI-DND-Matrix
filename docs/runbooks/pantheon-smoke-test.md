# Pantheon generation — smoke test

Manual + automated checks for epic **059** (pantheon stage + review/hub UI + known-setting deities).

## Automated (required)

```bash
npx vitest run \
  src/main/campaignCreateIpc.contract.test.ts \
  src/main/campaignCreateIpc.test.ts \
  src/agents/campaignGeneration/campaignGeneration.test.ts \
  src/main/campaignIpc.test.ts \
  src/db/repositories/deities.test.ts \
  src/main/campaignEditIpc.test.ts \
  src/renderer/src/campaignReview/CampaignReviewPantheonSection.test.tsx

npm test
npm run lint
npm run build
```

## Manual create (real provider)

1. Create a campaign with an **original** premise → progress should show **canon → pantheon → world → …**; review shows **Pantheon** under the world section with 8–12 gods and ≥2 **Forgotten** tags in View Pantheon.
2. Create a campaign with a **known setting** premise (e.g. “world of the shield hero”) → pantheon should prefer recognizable setting faiths/deities (e.g. Three Heroes / Ost Hero) rather than a wholly invented roster.
3. Edit the pantheon summary on review → reload → summary persists.
4. Open the campaign hub → pantheon summary + View Pantheon appear read-only.

## Verification

- [ ] Automated commands above pass
- [ ] Manual create with original premise completed
- [ ] Manual create with known-setting premise completed (deities recognizable)
- [ ] Summary edit persists; hub read-only confirmed
