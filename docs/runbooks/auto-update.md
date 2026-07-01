# Auto-update and releases

Packaged Windows builds use **electron-updater** with GitHub Releases as the update server.

CI builds with `electron-builder --publish never` (artifacts only). The deploy workflow uploads release **files** only (`latest.yml`, installers, blockmaps) via `gh release create`; the `win-unpacked` build folder is not uploaded.

## Installers vs portable

| Artifact | Auto-update | GitHub Release |
|----------|-------------|----------------|
| `AI TTRPG Matrix-Setup-x.y.z.exe` (NSIS) | Yes — silent download + install on quit (or “Restart now”) | Yes |
| `AI TTRPG Matrix-x.y.z-Portable.exe` | No — manual download only | Yes |

Install the **Setup** build for automatic updates. Keep the portable build for users who want a single file without installing.

## Versioning

Each successful deploy to `main` runs `scripts/bump-minor-version.mjs` before packaging:

- `0.0.1` → `0.1.0` → `0.2.0`
- Release tag: `v0.1.0` (semver, no commit SHA suffix)
- `latest.yml` in the release powers in-app update checks

Version-bump commits use `[skip ci]` so deploy does not loop.

## Local / dev

Auto-update is disabled when `app.isPackaged` is false. Set `DISABLE_AUTO_UPDATE=1` to disable in packaged builds.
