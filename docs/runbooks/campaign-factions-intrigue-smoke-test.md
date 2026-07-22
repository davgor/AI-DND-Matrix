# Campaign factions intrigue playpath — smoke test

Manual + automated checks for epic **125** (factions, reputation, relations, deity NPC-ification).

## Automated (required)

```bash
npx vitest run \
  src/shared/factions/ \
  src/db/repositories/factions.test.ts \
  src/db/repositories/deleteCampaign.test.ts \
  src/agents/factionNarration.test.ts \
  src/agents/factionPlayContext.test.ts \
  src/agents/deityManifestation.test.ts \
  src/agents/factionIntriguePlaypath.test.ts \
  src/agents/campaignGeneration/campaignGeneration.test.ts \
  src/main/campaignCreateIpc.contract.test.ts \
  src/renderer/src/campaignReview/CampaignReviewFactionsSection.test.tsx

npm test
npm run lint
npm run build
npm run deadcode
```

Then run GitHub Actions workflows via `act` (pr-checks + deadcode) per delivery standards.

## Intrigue-capable loop (court or faith)

1. **Create** a campaign with an intrigue-heavy premise (courts, guild rivalries, temple politics). Progress should include **factions** after world. Review → **Factions** section shows pressure, roster (religious rows with deity labels), and relations.
2. **Play as PC A:** aid a rival faction (e.g. smugglers vs court) → DM emits `reputationUpdates` for the active character only. Confirm standing shifts for PC A; open hub with PC B later — B remains neutral with that faction.
3. **Slight a temple** (desecrate shrine / expose clergy) → religious reputation drops for the acting PC; relation updates may mark temple ↔ rival as more tense.
4. **God manifests** once (prayer answered / walks the city) → `deityManifestation` creates one speakable NPC; a second manifestation reuses the same NPC. Speak to them in Social like any NPC.
5. **Restart** the app / reopen the campaign → pressure, factions, relations, reputations, and manifestation NPC survive.

Legacy campaigns with no factions: Factions section stays hidden; on-demand mint via play still works.

## Verification

- [ ] Automated commands above pass
- [ ] Manual intrigue create → review factions populated
- [ ] Per-PC reputation isolation confirmed (two cast members)
- [ ] Manifestation idempotent + Social workable
- [ ] Restart integrity confirmed
