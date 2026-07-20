# 101 — App icon: shield AI branding

Adopt the generated shield-AI mark as the official app icon for packaging (Windows/macOS), the Electron window, and in-app brand iconography (titlebar / loading).

## Acceptance criteria

- [x] Source brand asset lives in-repo (`build/icon.png` and renderer `app-icon.png`) derived from the chosen shield mark
- [x] `package.json` `build.icon` points at the build icon so packaged `.exe` / installer / mac targets use it
- [x] Main `BrowserWindow` sets `icon` so the taskbar/dock mark matches in dev and packaged runs
- [x] Titlebar (and loading screen) show the brand mark beside the product name
- [x] Tests cover branding path / package.json icon wiring and titlebar icon presence
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI workflows pass
