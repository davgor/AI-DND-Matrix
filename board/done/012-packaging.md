# EPIC: Packaging - Windows .exe export

Broken down into sub-tickets 012.1-012.6. This epic is done when all of them are.

012.1 clean-checkout build · 012.2 launch without dev toolchain · 012.3 packaged .env/config read · 012.4 setup README · 012.5 packaged save persistence · 012.6 harden CSP for release

## Sub-tickets

### 012.1 Clean-checkout package build verification

#### Description
Confirm `npm run package` produces a working .exe from a clean checkout with no manual steps beyond `npm install`.

#### Acceptance Criteria
- [x] A fresh clone + `npm install` + `npm run package` produces a runnable `.exe`
- [x] No undocumented manual steps are required

### 012.2 Packaged app launches without dev toolchain

#### Description
Confirm the packaged app launches on a machine without the dev environment installed.

#### Acceptance Criteria
- [x] The packaged `.exe` launches on a machine without Node/dev tools installed and reaches the campaign sidebar

### 012.3 Packaged app reads .env/provider config

#### Description
Confirm the packaged app correctly reads `.env`/config for provider selection.

#### Acceptance Criteria
- [x] Packaging with Claude configured in `.env` results in working agent calls in the packaged app

### 012.4 Setup README section

#### Description
Write the minimal setup README section: install/run the .exe, configure a Claude API key, switch providers via .env.

#### Acceptance Criteria
- [x] README includes install/run instructions for the packaged `.exe`
- [x] README includes Claude API key setup instructions and how to switch providers (e.g. to Player2, once its adapter epic 014 lands) via `.env`

### 012.5 Packaged app save persistence

#### Description
Confirm a save created in the packaged app persists correctly across closing and reopening the packaged .exe.

#### Acceptance Criteria
- [x] A campaign created/played in the packaged app persists correctly after fully closing and reopening the packaged `.exe`

### 012.6 Harden CSP for release build

#### Description
Ticket 001.3 added a baseline CSP to `src/renderer/index.html`, but it allowlists `http://localhost:5173`/`ws://localhost:5173` (for the Vite dev server/HMR) and includes `'unsafe-inline'`/`'unsafe-eval'` (needed by Vite's React Fast Refresh in dev). Those allowances have no reason to ship in a packaged release build and should be removed or made dev-only before the app goes out to anyone.

#### Acceptance Criteria
- [x] The packaged/production build's CSP no longer allowlists `localhost:5173` or any dev-server origin
- [x] The packaged/production build's CSP does not include `'unsafe-eval'`; `'unsafe-inline'` is removed or justified if something still genuinely requires it
- [x] Dev mode (`npm run dev`) still works after the change (dev-only CSP allowances, if still needed, are applied conditionally — e.g. via a build-time env check — rather than shipped unconditionally)
- [x] Verified via the same CDP-based check used in 001.3: launch the packaged app and confirm `document.querySelector('meta[http-equiv="Content-Security-Policy"]')` no longer contains dev-server origins or `unsafe-eval`
