# 079 — Rebrand display name to AI-TTRPG

Strip "Matrix" from the user-facing product name. The game/app should present as **AI-TTRPG** (window title, loading screen, packaged `.exe`, README/runbooks, release titles). Keep stable install identifiers (`package.json` `name`, Electron `appId`, GitHub repo) unchanged for existing installs and tooling.

## Acceptance criteria

- [ ] `APP_DISPLAY_NAME` / `build.productName` is `AI-TTRPG`
- [ ] Titlebar, loading screen, and `index.html` title show `AI-TTRPG`
- [ ] README, smoke runbooks, auto-update docs, and deploy release title use `AI-TTRPG` (not `AI TTRPG Matrix`)
- [ ] Branding / compatibility tests and `terminology:check` expect the new name
- [ ] `npm test`, `npm run lint`, and `npm run build` pass
- [ ] npm `name` and Electron `appId` remain unchanged
