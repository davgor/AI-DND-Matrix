# Play-time world population smoke test (epic **134**)

Validates on-demand NPC mint during play via typed `npcProposals` — idempotent, clamped, FK-safe, and excluded from journal known-candidates until meet rules.

## Prerequisites

- `npm install`
- A campaign with at least one region and a living player character in play

## Automated coverage (targeted)

```bash
npx vitest run \
  src/shared/playPopulation \
  src/agents/npcPlayMintNarration.test.ts
```

Critical paths covered:

- Proposal validation, per-turn clamp (`MAX_NPC_PROPOSALS_PER_TURN = 2`), idempotency by name/key
- `persistNpcPlayMintSideEffects` → `createNpc` with identity bundle fields
- `persistNarrationSideEffects` wiring in `dm.ts`
- Minted NPC in `presentNpcs` but excluded from `personCandidates` until log-book link or dossier opinion

## Manual smoke (full app)

1. Run `npm run rebuild:electron` then `npm run dev`.
2. Resume a campaign in play. In a tavern or street scene, take an action that causes the DM to introduce a **new** named NPC (e.g. barkeeper) not already in the cast.
3. Confirm the NPC appears in Social / Scene on subsequent turns (grounded in region).
4. Close and reopen the campaign (or reload play view). Confirm the NPC row still exists (Campaign Review or DB-backed presence in region).
5. Open the journal person-link overlay: the new NPC should **not** appear as a linkable candidate until you meet them (log-book person entry with link) or generate a dossier opinion.
6. Add a log-book People entry linked to the minted NPC (or generate dossier). Confirm the name becomes linkable in journal/scene/social prose.

## Place mint (deferred)

Light place/region mint is **not** in v1 — follow-up epic **142**. `placeProposals` are ignored.

## Notes for CI / delivery gate

Full `npm test` / lint / build / deadcode / `act` are owned by the parent merge pass after parallel epics finish — not required inside this epic’s implementer slice when scoped to targeted vitest only.
