# EPIC: Smoother Discord-like auto-updates

Make packaged Setup builds feel closer to Discord: keep checking for updates while the app is open, let users trigger a check from Settings, and apply downloaded updates with a silent restart (no installer wizard).

Builds on the existing electron-updater + NSIS Setup path (`docs/runbooks/auto-update.md`). Portable builds stay manual-download-only.

Broken down into sub-tickets **062.1–062.3**. This epic is done when all are complete and `npm test`, `npm run lint`, and `npm run build` pass.

## Definition of done

- Packaged apps poll for updates on a fixed interval after the initial delayed check
- Settings exposes a manual “Check for updates” control wired through IPC
- Downloaded updates install silently on restart/quit (no NSIS wizard UX)
- Runbook documents polling + silent apply expectations

062.1 periodic polling · 062.2 manual check in Settings · 062.3 silent-update UX + runbook

## Sub-tickets

### 062.1 — Periodic update polling

Today `initAutoUpdate` schedules a single check ~8s after launch. Long-running sessions never see a release published while the app stays open. Add a recurring poll (hours-scale) that reuses the same check path, without stacking checks when one is already in flight or an update is already downloaded.

#### Acceptance criteria

- [x] After the initial delayed check, packaged builds schedule recurring `checkForUpdates` calls on a documented interval
- [x] A check in progress (or `downloaded` phase) does not start another overlapping check
- [x] Unit tests cover scheduling / skip-when-busy behavior with fake timers (electron-updater mocked)
- [x] `npm test` covers the new auto-update tests

### 062.2 — Manual check for updates in Settings

Add an IPC `autoUpdate:checkForUpdates` (and preload API) plus a Settings control so users can request a check without restarting the app. Reuse the same guarded check path as polling.

#### Acceptance criteria

- [x] Settings shows a “Check for updates” control near the version label
- [x] Invoking it calls the main-process check path via typed preload IPC
- [x] Unit/component tests cover the Settings control wiring (or pure handler) for the check action
- [x] Checking is a no-op / safe when auto-update is disabled (dev / `DISABLE_AUTO_UPDATE`)

### 062.3 — Silent apply UX + runbook

Confirm silent install (`quitAndInstall(true, true)`) remains the only apply path, tighten banner/Settings copy so users expect a Discord-like restart (not a reinstall wizard), and document polling + silent apply in the auto-update runbook.

#### Acceptance criteria

- [x] Banner / ready-state copy communicates silent restart apply (no installer wizard)
- [x] `quitAndInstall` continues to use silent + force-run-after (`true, true`)
- [x] `docs/runbooks/auto-update.md` documents interval polling, manual check, and silent Setup apply
- [x] `npm test`, `npm run lint`, and `npm run build` pass
