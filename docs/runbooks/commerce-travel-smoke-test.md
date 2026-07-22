# Commerce + travel intents — smoke test

Manual + automated checks for epic **135** (engine-owned buy/sell/travel resolve).

## Automated (targeted)

```bash
npx vitest run \
  src/shared/commerceTravel/ \
  src/engine/commerceTravel/ \
  src/db/repositories/commerceTravelResolve.test.ts \
  src/main/commerceTravelTurn.test.ts \
  src/renderer/src/playView/commerceTravelFeedback.test.tsx \
  src/renderer/src/playView/PlayStatusAlerts.test.tsx
```

Full delivery gate (`npm test` / lint / build / deadcode / `act`) is owned by the integration pass — not required for this smoke note alone.

## Playpath (buy → sheet; travel → region)

1. **Play** in a market-like region with a shopkeeper NPC and enough gold.
2. Submit a clear buy line (e.g. `I buy a dagger`) — even if the DM reply is NPC dialogue only.
3. Confirm:
   - Status alert shows engine success (`Bought Dagger…`) without needing purchase prose from the DM.
   - Character sheet inventory includes the dagger; currency decreased by the engine price.
4. Submit a broke buy (`I buy a Longsword` with 0 gold) → fail alert (`cannot afford`), inventory unchanged.
5. Submit travel to a **known** region (`I travel to <RegionName>`) → world day advances; play/hub `currentRegionId` updates; success alert names the destination.
6. Optional: travel to an unknown name that cannot be generated → fail alert (`No known destination` / charting failure), region unchanged.
7. Restart the app / reopen the campaign → inventory, currency, region, and in-game date persist.

## Explicit non-goals

No graphical shop UI, map picker, or bargaining mini-game — composer remains the channel.

## Verification

- [ ] Targeted vitest commands above pass
- [ ] Manual buy → sheet item; travel → region/day update
- [ ] Fail copy visible for broke / unknown item / unknown destination
- [ ] Delivery gate (full suite + `act`) pass on integration
