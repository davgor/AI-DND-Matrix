# Multi-PC shared time smoke test (epic **133**)

Validates **Model B**: one shared campaign clock (`campaigns.in_game_date`) + per-PC last-active watermark + deterministic away digest / hub copy. No parallel calendars.

## Prerequisites

- `npm install`
- A hub-eligible campaign with **at least two** living player characters (Alice + Bob) who completed guided creation
- Optional: provider configured for inactive-proxy encounters; not required for clock/watermark smoke

## Automated coverage (targeted)

```bash
npx vitest run \
  src/shared/sharedTime \
  src/db/repositories/characterSharedTime.test.ts \
  src/db/schema.test.ts \
  src/main/sharedTimeWatermark.test.ts \
  src/agents/sharedTimeGrounding.test.ts \
  src/agents/inactivePlayer.test.ts \
  src/renderer/src/campaignHub/SharedTimeCopy.test.tsx \
  src/renderer/src/campaignHub/CampaignHubCastRail.test.tsx \
  src/renderer/src/campaignHub/CampaignHub.test.tsx
```

Critical paths covered:

- Model B lock + away digest helpers (`src/shared/sharedTime`)
- Schema migration **53** (`last_active_in_game_date`) and monotonic watermark touch
- Watermark update on travel / long rest / short rest via `resolvePlayerTurn`
- DM + inactive-proxy shared-time grounding (no private calendar)
- Hub world day, cast last-active, away blurb empty vs present

## Manual smoke (full app + UI)

1. Run `npm run rebuild:electron` then `npm run dev`.
2. Open a hub-eligible campaign with Alice and Bob. Note hub header **World day N** and each cast card **Last active: day …**.
3. **Resume Alice.** Play until you can take a **long rest** (or travel several days). Confirm play chrome day advances.
4. Return to Campaign Hub (or reopen the campaign). Confirm:
   - Header **World day** matches the advanced clock (same for the whole campaign).
   - Alice’s cast card **Last active** matches that world day.
   - Bob’s **Last active** is still behind (or day 0 if never played) and an **away** blurb appears naming shared world time — not a private calendar.
5. **Resume Bob.** Confirm Bob enters the **same** world day (no second clock). Away blurb should clear after Bob successfully plays a turn (watermark catches up).
6. Optional: with Alice and Bob in the same region, trigger an inactive-proxy beat — proxy grounding must mention the shared world day and must not invent Bob’s own calendar.

## Notes for CI / delivery gate

Full `npm test` / lint / build / deadcode / `act` are owned by the parent merge pass after parallel epics finish — not required inside this epic’s implementer slice when scoped to targeted vitest only.
