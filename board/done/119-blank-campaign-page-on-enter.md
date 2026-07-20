# 119 — Blank campaign page on enter

Entering a campaign/game shows a completely blank dark screen (no titlebar), consistent with a React render crash that unmounts `#root` (no ErrorBoundary).

## Description

Confirmed via Electron DevTools on a real save: **Resume → PlayView** throws `TypeError: Illegal invocation` in `DmExpositionSceneHeader` when incoming-highlight timers fire (scene summary changes after narration log load). Root cause: `HighlightTimer` / `IdHighlightTracker` (and D20 overlay hook) stored bare `setTimeout`/`clearTimeout` references as defaults; Chromium requires calling them as methods on `window`/`globalThis`.

Also hardened adjacent crash paths (empty perk level-up queue, null character stats, hub snapshot refetch).

## Acceptance criteria

- [x] Root-cause render crash identified and fixed (`Illegal invocation` from unbound timers — bound via `globalThis.setTimeout`/`clearTimeout`)
- [x] Failing-then-passing test covers default timer bind path (`incomingHighlight.timerBind.test.ts`)
- [x] `useHubSnapshot` clears/refetches when `campaignId` changes (stale early-return fixed + unit test)
- [x] Empty-perk / corrupted pending level-up queue rows do not crash PlayView and do not soft-lock turns (`hasPendingLevelUp` ignores them)
- [x] `npm test` / `npm run lint` / `npm run build` / `npm run deadcode` pass
- [x] `act` pr-checks.yml + deadcode.yml succeed
- [x] Live Resume → PlayView no longer blanks (verified via Electron console / CDP)
