# 102 — Transparent app icon corners

The shield brand icon PNGs currently have opaque white corners outside the rounded square. Make those corner pixels fully transparent so the taskbar/desktop icon blends into dark backgrounds.

## Acceptance criteria

- [x] `build/icon.png` and `src/renderer/public/app-icon.png` have transparent (alpha 0) corner pixels instead of white
- [x] `build/icon.ico` is regenerated from the fixed PNG (multi-size)
- [x] Automated test asserts corner samples of the brand PNGs are transparent
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
