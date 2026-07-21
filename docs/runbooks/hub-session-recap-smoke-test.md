# Hub session recap smoke test

Validates epic **124**: Campaign Hub shows a persisted **Session recap** instead of raw Recent events, with freshness vs `last_played_at`.

See also [campaign-hub-smoke-test.md](./campaign-hub-smoke-test.md) (Session recap section).

## Automated coverage

```bash
npx vitest run src/shared/sessionRecap src/db/repositories/sessionRecap.test.ts src/main/recapIpc.test.ts src/renderer/src/campaignHub/HubSessionRecapSection.test.tsx src/renderer/src/campaignHub/CampaignHubWorldPreview.test.tsx src/main/campaignHubIpc.test.ts
```

## Manual smoke

1. Play a turn → leave to hub → reopen → **new** recap after play past the previous `generatedAt`.
2. Reopen again **without** play → **same** recap / no extra generate.
3. Confirm hub title is **Session recap** (not Recent events) and loading copy appears only while generation runs.
