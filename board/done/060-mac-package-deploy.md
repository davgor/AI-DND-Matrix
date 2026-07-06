# 060 — Deploy macOS package alongside Windows installers

Add a macOS `.dmg` to the deploy workflow so each GitHub Release ships Windows installers and a Mac disk image.

## Acceptance criteria

- [x] `package.json` defines a mac electron-builder target and `package:mac` script
- [x] Deploy workflow builds Windows artifacts on `windows-latest` and mac artifacts on `macos-latest`
- [x] A single release uploads Windows installers plus the mac `.dmg` (top-level `release/` files only)
- [x] `npm test`, `npm run lint`, and `npm run build` pass
