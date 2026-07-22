# Play-time world population smoke test (epic **134** + ticket **141**)

Validates on-demand NPC and place mint during play via typed `npcProposals` / `placeProposals` — idempotent, clamped, FK-safe. NPCs stay excluded from journal known-candidates until meet rules.

## Prerequisites

- `npm install`
- A campaign with at least one region and a living player character in play

## Automated coverage (targeted)

```bash
npx vitest run \
  src/shared/playPopulation \
  src/agents/npcPlayMintNarration.test.ts \
  src/agents/placePlayMintNarration.test.ts
```

Critical paths covered:

- Proposal validation, per-turn clamp (`MAX_NPC_PROPOSALS_PER_TURN = 2`, `MAX_PLACE_PROPOSALS_PER_TURN = 2`), idempotency by name/key
- `persistNpcPlayMintSideEffects` → `createNpc` with identity bundle fields
- `persistPlacePlayMintSideEffects` → `createRegion` (parent hints FK-safe; unknown → turn region)
- `persistNarrationSideEffects` wiring in `dm.ts`
- Minted NPC in `presentNpcs` but excluded from `personCandidates` until log-book link or dossier opinion

## Manual smoke (full app)

### NPC mint

1. Run `npm run rebuild:electron` then `npm run dev`.
2. Resume a campaign in play. In a tavern or street scene, take an action that causes the DM to introduce a **new** named NPC (e.g. barkeeper) not already in the cast.
3. Confirm the NPC appears in Social / Scene on subsequent turns (grounded in region).
4. Close and reopen the campaign (or reload play view). Confirm the NPC row still exists (Campaign Review or DB-backed presence in region).
5. Open the journal person-link overlay: the new NPC should **not** appear as a linkable candidate until you meet them (log-book person entry with link) or generate a dossier opinion.
6. Add a log-book People entry linked to the minted NPC (or generate dossier). Confirm the name becomes linkable in journal/scene/social prose.

### Place mint (ticket **141**)

1. In play, take an action that introduces an **unnamed hamlet** / new settlement the fiction should remember as a place.
2. Confirm a new region row appears (Campaign Review regions list or `listRegionsByCampaign`).
3. Close and reopen the campaign. Confirm the minted place still exists.
4. Re-trigger the same place (same name/key): no duplicate region.

## Notes for CI / delivery gate

Full `npm test` / lint / build / deadcode / `act` are owned by the parent merge pass after parallel epics finish — not required inside this epic’s implementer slice when scoped to targeted vitest only.
