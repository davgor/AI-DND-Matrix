# 120 — Restore Electron binary after npm install

`electron@42` no longer ships a `postinstall` that downloads the Chromium binary. After `npm audit fix` / reinstall, `node_modules/electron` can exist without `path.txt` / `dist/electron.exe`, and `electron-vite` fails with `Error: Electron uninstall`.

## Acceptance criteria

- [x] Electron binary present locally (`node_modules/electron/path.txt` + `dist/electron.exe`)
- [x] `package.json` runs `node node_modules/electron/install.js` on `postinstall` and `predev` so `npm run dev` self-heals
