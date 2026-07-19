# EPIC: Mirror ElectronServerManager app auto-update parity

Bring AI-TTRPG’s packaged update path to full parity with **ElectronServerManager**’s app updater (`src/main/appUpdater.ts`, `docs/AUTO_UPDATE.md`, epics 012 / 015 / 031) — not the SteamCMD game/server updater in ESM’s `autoUpdate.ts`.

**Already done here (do not re-implement):** epic **062** + `docs/runbooks/auto-update.md` + `src/main/autoUpdate.ts` already cover electron-updater → GitHub Releases, NSIS Setup auto-update (portable manual-only), 4h polling with in-flight guards, silent `quitAndInstall(true, true)`, Settings “Check for updates”, `DISABLE_AUTO_UPDATE`, and titlebar version. This epic is the remaining ESM mirror work.

Reference: `C:\Users\davgo\Documents\GitHub\ElectronServerManager` (or `davgor/ElectronServerManager`).

Broken down into sub-tickets **086.1–086.3**. Done when all are complete and `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass.

## Definition of done

- Deploy refuses to ship a release whose updater metadata (`latest.yml` / `latest-mac.yml` if present) points at missing or misnamed artifacts (ESM 015 hygiene)
- Update banner UX matches ESM’s phase coverage: checking, available (from→to), downloading with progress, ready + install CTA, visible error
- Runbook documents Windows + macOS artifact / feed expectations the way ESM documents Win + Linux
- Packaged Setup path still silent-applies; portable / DMG manual-install rules stay explicit

086.1 release artifact verify · 086.2 richer UpdateBanner · 086.3 mac feed + runbook parity

## Sub-tickets

### 086.1 — Release artifact sanitize + `latest.yml` verify

ESM’s release workflow sanitizes spaced filenames and verifies every path in `latest.yml` / `latest-linux.yml` exists on disk before upload (epic 015). AI-TTRPG already uses space-free `artifactName` patterns (`AI-TTRPG-Setup-…`), but `.github/workflows/deploy.yml` still uploads `release/*` with no metadata check — a mismatched yml/blockmap can still ship a 404ing update.

#### Acceptance criteria

- [x] Deploy (or a shared script invoked by deploy) verifies Windows `latest.yml` path entries resolve to files that will be uploaded; fail the job on mismatch
- [x] If macOS publishes updater metadata (`latest-mac.yml`), it is verified the same way; if DMG is manual-only, that is an explicit documented choice and the verify step does not require a mac feed
- [x] Runbook notes the no-spaces / yml-path-must-match-disk rule (mirror ESM `docs/AUTO_UPDATE.md` “Artifact naming”)
- [x] Unit or scripted test covers the verify helper with fixture yml + temp files (happy path + missing asset)

### 086.2 — Richer UpdateBanner (ESM phase UX)

ESM’s banner shows checking, `current → available`, determinate download progress bar, ready with **Restart & Install** (plus install error), and a visible error state. AI-TTRPG’s `UpdateBanner` hides `checking` / `error` and is text-only during download.

#### Acceptance criteria

- [x] Banner surfaces `checking` (brief status) and `error` (alert with message), not only available / downloading / downloaded
- [x] Available / downloading copy includes version context when known (e.g. current → available); downloading shows a progress affordance using `downloadPercent`
- [x] Ready CTA remains explicit user action (no auto-quit on download); silent apply path unchanged
- [x] Component tests cover phase rendering (checking / downloading / ready / error) with mocked `window.autoUpdate`

### 086.3 — macOS updater feed clarity + runbook parity

ESM documents which artifacts auto-update vs manual. AI-TTRPG ships Windows Setup + portable and mac DMG (**060**) but the runbook is Windows-centric. Align docs (and feed behavior if needed) with reality.

#### Acceptance criteria

- [x] `docs/runbooks/auto-update.md` has an artifact table covering Windows NSIS / portable and mac DMG (and `latest-mac.yml` if/when published)
- [x] Documented behavior matches deploy + electron-builder output (either mac participates in electron-updater, or DMG is clearly manual-download-only)
- [x] Verification checklist includes at least one Windows Setup update path and a clear mac expectation
- [x] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
