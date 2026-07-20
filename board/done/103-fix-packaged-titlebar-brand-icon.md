# 103 — Fix packaged titlebar brand icon

In packaged/release builds the titlebar brand mark shows a broken image. Absolute `/app-icon.png` resolves incorrectly under Electron `file://` (`loadFile`). Bundle the mark via Vite so the img `src` is a relative asset URL that works in both dev and packaged builds.

## Acceptance criteria

- [x] Brand mark image is imported as a Vite asset (not an absolute `/…` public URL)
- [x] Packaged renderer can resolve the titlebar/loading brand mark (`file://`-safe relative URL)
- [x] Tests updated for the new brand-mark source wiring
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
