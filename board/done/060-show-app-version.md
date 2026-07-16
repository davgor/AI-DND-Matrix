# 060 — Show app version in UI

Surface the packaged app version in the UI so release auto-update can be verified at a glance (install → note version → wait for update → confirm new version).

Uses existing `autoUpdate:getState` / `app.getVersion()` (`currentVersion`); no new IPC.

## Acceptance criteria

- [x] Titlebar shows the current app version (e.g. `v0.9.0`) next to the product name
- [x] Settings panel shows the same version so it is discoverable without hunting the chrome
- [x] Unit test(s) cover the version label rendering / formatting
- [x] `npm test`, `npm run lint`, and `npm run build` pass
