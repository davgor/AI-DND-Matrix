# Hard world mutations — smoke test

Manual + automated checks for epic **130** (engine-owned place/person structured mutations).

## Automated (required)

```bash
npx vitest run \
  src/shared/worldMutations/ \
  src/agents/worldMutationNarration.test.ts \
  src/agents/worldMutationGrounding.test.ts \
  src/agents/turnRoutingHeuristic.test.ts \
  src/main/campaignHubIpc.test.ts \
  src/renderer/src/campaignHub/CampaignHubWorldPreview.test.tsx

npm test
npm run lint
npm run build
npm run deadcode
```

Then run GitHub Actions workflows via `act` (pr-checks + deadcode) per delivery standards.

## Playpath (burn → leave → reopen)

1. **Play** in a region with a named place (village/keep). Submit a world-alter action (e.g. “I burn the village to the ground”).
2. Confirm the turn hits **DM narration** (not heuristic act-only) and the model emits `regionStatusUpdates` with `op: "destroy"` (optional `worldFact` for why).
3. **Hub / World preview:** region shows the destroyed banner with cause.
4. **Leave** the session / restart the app / reopen the campaign.
5. **Return to play** in that region: DM grounding includes `Region status` with `destroyed: true` and the world-condition digest forbidding pristine assumptions without `restore`.
6. Optional: propose `op: "restore"` on a later turn → destroyed clears; hub banner gone.

Legacy campaigns with prose-only burns: facts remain; new burns also set structured status when proposed.

## Explicitly non-mutating routes

Heuristic converse/act, rest/travel/modifyItem, combat bypass, Ask-the-DM OOC — must not silently drop pending typed mutations; world-alter verbs defer heuristic rows so narration can persist.

## Verification

- [ ] Automated commands above pass
- [ ] Manual burn → hub destroyed → restart → grounding still knows
- [ ] Invalid region/npc ids never corrupt other rows
- [ ] Delivery gate (`npm test` / lint / build / deadcode / `act`) pass
