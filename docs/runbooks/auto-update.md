# Auto-update and releases

Packaged builds use **electron-updater** with GitHub Releases as the update server.

CI builds with `electron-builder --publish never` (artifacts only). The deploy workflow uploads release **files** only (`latest.yml`, installers, blockmaps, DMG) via `gh release create`; the `win-unpacked` / mac unpacked build folders are not uploaded.

Before upload, deploy runs `node scripts/verify-release-artifacts.mjs release` (sanitize spaced filenames + verify updater metadata paths exist on disk).

## Which artifacts auto-update

| Artifact | Auto-update | GitHub Release |
|----------|-------------|----------------|
| `AI-TTRPG-Setup-x.y.z.exe` (NSIS) | Yes — `latest.yml`; background poll/download + **silent** install on quit or “Restart & Install” | Yes |
| `AI-TTRPG-x.y.z-Portable.exe` | No — manual download only | Yes |
| `AI-TTRPG-x.y.z-*.dmg` (macOS) | No — manual download / reinstall only (no `latest-mac.yml` in the current matrix) | Yes |

Install the **Windows Setup** build for automatic updates. Use portable or mac DMG when you want a single-file / disk-image install without the in-app updater.

## Artifact naming (required for GitHub)

Release filenames must **not contain spaces**. GitHub Releases rewrites spaces to dots, while `latest.yml` from electron-builder uses hyphens — a mismatch causes auto-update downloads to 404.

`package.json` `build` config already sets space-free `artifactName` patterns. Deploy still runs `scripts/verify-release-artifacts.mjs`, which:

1. Renames any spaced filenames to hyphenated forms
2. Requires `latest.yml` and checks every `path:` / `url:` entry resolves to a file in `release/`
3. Verifies `latest-mac.yml` **only if present** (today mac ships DMG only, so that file is not required)

## How checks run (Windows Setup builds)

1. **Initial check** ~8 seconds after launch
2. **Polling** every **4 hours** while the app stays open (skips if a check/download is already in flight or an update is ready)
3. **Manual check** — Settings → “Check for updates” (same guarded path; shows status for checking / no update / update found; reports disabled in dev / when `DISABLE_AUTO_UPDATE=1`)

When an update is ready, the banner offers **Restart & Install**. Apply uses `quitAndInstall(true, true)`: silent NSIS (`/S`) and relaunch. Users should not see the installer wizard on update — only a brief restart, Discord-style.

## Versioning

Each successful deploy to `main` runs `scripts/bump-minor-version.mjs` before packaging:

- `0.0.1` → `0.1.0` → `0.2.0`
- Release tag: `v0.1.0` (semver, no commit SHA suffix)
- `latest.yml` in the release powers in-app update checks on Windows Setup installs

Version-bump commits use `[skip ci]` so deploy does not loop.

## Verification checklist

### Windows Setup (auto-update)

1. Install an older NSIS Setup build; confirm the titlebar shows that version (`vX.Y.Z`).
2. Publish a newer GitHub Release that includes matching `latest.yml`, Setup exe, and blockmap (normal `main` deploy).
3. Launch the older install — banner should show checking / available / downloading / ready (or leave the app open past a poll interval / use Settings → Check for updates).
4. Choose **Restart & Install** — NSIS should apply silently (no installer wizard).
5. Confirm the titlebar version matches the new release tag.

### macOS DMG (manual)

1. Download the newer `.dmg` from the GitHub Release.
2. Install / replace the app from the disk image.
3. Confirm the titlebar version matches the release. There is no in-app mac auto-update path today.

## Local / dev

Auto-update is disabled when `app.isPackaged` is false. Set `DISABLE_AUTO_UPDATE=1` to disable in packaged builds. Dev still shows `package.json` version via `app.getVersion()`.
