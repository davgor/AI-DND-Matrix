# Play shell resilience smoke test (Epic 136)

Validates ErrorBoundary fallback around play and turn-failure Retry/Abort behavior without remote crash reporting.

See [play-resilience SPEC](../../src/shared/playResilience/SPEC.md) for locked product rules.

## Prerequisites

- Dev: `npm install`
- A campaign with at least one player character in play mode
- Optional: configure a cloud provider or use Player2 stub for turn resolution

## Manual smoke — ErrorBoundary fallback

1. Start `npm run dev` and enter **Play** for an existing campaign.
2. Temporarily force a render throw (DEV only): in React DevTools or a one-line dev hook, throw inside a play-only child — e.g. add `if (import.meta.env.DEV) throw new Error('smoke')` to a play component, then reload play.
3. Confirm the fallback panel appears (**Play view interrupted**) instead of a blank window.
4. Click **Return to Hub** — should land on campaign hub with titlebar intact.
5. Re-enter play, trigger fallback again, click **Reload play** — play subtree remounts without quitting the app.
6. Remove any temporary throw before committing.

## Manual smoke — turn failure Retry (safe)

1. Disconnect network or stop the configured LLM provider.
2. Submit a simple action (e.g. short rest phrase) from the player composer.
3. Confirm DM scene header shows a non-technical error with **Retry** and **Abort**.
4. Restore provider connectivity.
5. Click **Retry** — turn should resolve once; HP/log updates exactly once (no double rest heal).

## Manual smoke — turn failure Abort (unsafe / post-mutation)

1. With provider flaky or stubbed to fail on narration after a check turn, submit an action that rolls a check.
2. If the failure is non-retryable (no **Retry** button), click **Abort**.
3. Confirm scene error clears and the last good save state remains (no duplicate events in log book / narration feed).

## Automated tests (targeted)

```bash
npx vitest run src/shared/playResilience/mapTurnFailure.test.ts
npx vitest run src/main/turnResolveRecovery.test.ts
npx vitest run src/renderer/src/playResilience/PlayShellErrorBoundary.test.tsx
npx vitest run src/renderer/src/playView/dmExpositionParts.test.ts
```

## Recorded run (template)

| Date | Mode | Scenario | Result | Notes |
|------|------|----------|--------|-------|
| YYYY-MM-DD | dev | Boundary fallback | pass/fail | |
| YYYY-MM-DD | dev | Retry before mutation | pass/fail | |
| YYYY-MM-DD | dev | Abort after mutation | pass/fail | |

## Delivery gate (136.5 — run before merge)

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run deadcode`
- [ ] `act` PR-checks + deadcode workflows
