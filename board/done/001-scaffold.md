# EPIC: Scaffold the Electron + React + TS project

Broken down into sub-tickets 001.1-001.9 (see files in this folder). This epic is done when all of them are.

001.1 Electron+Vite+React init · 001.2 frameless window + titlebar · 001.3 security baseline · 001.4 dev boot script · 001.5 package/export script · 001.6 oxlint config · 001.7 Vitest config · 001.8 .env/secrets handling · 001.9 local logging

## Sub-tickets

### 001.1 Initialize Electron + Vite + React + TS project structure

#### Description
Stand up the bare project: package.json, TypeScript config, Vite config for the renderer, Electron main/preload entry points wired together, and the `/src` folder layout from the plan (`/main`, `/preload`, `/renderer`, `/engine`, `/agents`, `/db`, `/shared`).

#### Acceptance Criteria
- [x] `/src/main`, `/src/preload`, `/src/renderer`, `/src/engine`, `/src/agents`, `/src/db`, `/src/shared` directories exist with placeholder entry files
- [x] `npm install` succeeds from a clean checkout
- [x] Electron launches a window that loads the Vite-served React renderer in dev mode (a "Hello World" placeholder is acceptable)
- [x] TypeScript strict mode is enabled in `tsconfig.json` and the project type-checks with zero errors

### 001.2 Frameless window + custom titlebar

#### Description
Replace the native window frame with a frameless Electron window and a custom React titlebar component matching the Discord-style chrome decision: draggable region, minimize/maximize/close buttons.

#### Acceptance Criteria
- [x] BrowserWindow is created with `frame: false`
- [x] A `/renderer/titlebar` component renders a draggable bar (`-webkit-app-region: drag`) plus minimize/maximize/close buttons
- [x] Clicking minimize/maximize/close calls the corresponding Electron window action via IPC and visibly works
- [x] No native OS window frame/menu bar is visible when the app launches

### 001.3 Electron security baseline

#### Description
Lock down the Electron security posture from the start: contextIsolation, sandbox, disabled nodeIntegration, a narrow typed IPC surface, and a restrictive CSP.

#### Acceptance Criteria
- [x] BrowserWindow webPreferences set `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- [x] `/preload` exposes only a small, explicitly-named, typed set of `contextBridge` channels (placeholder channel names acceptable at this stage)
- [x] No channel allows arbitrary code/SQL execution from the renderer
- [x] A CSP meta tag or response header is set on the renderer restricting remote script/style sources

### 001.4 Single-command dev boot script

#### Description
One script boots Electron, the React dev server, and a dev SQLite file together, so manual testing never requires multiple terminals.

#### Acceptance Criteria
- [x] `npm run dev` starts the Vite dev server and launches Electron pointed at it, in one command
- [x] A dev-mode SQLite file path is configured separately from the eventual packaged-app data path
- [x] Running `npm run dev` twice in a row (after stopping) works cleanly with no leftover process/port conflicts

### 001.5 Package/export script (Windows .exe)

#### Description
Add the packaging script that produces a distributable Windows executable via electron-builder or electron-forge.

#### Acceptance Criteria
- [x] `npm run package` produces a `.exe` (or installer) in a build output directory
- [x] The packaged app launches and shows the frameless window with titlebar from a clean checkout build
- [x] Packaging is not wired into any CI workflow yet (local/manual only at this stage)

### 001.6 oxlint strict config + governance

#### Description
Configure oxlint with the agreed strictness: complexity, length, params, and nesting limits, plus a written governance note that relaxing rules requires explicit user permission.

#### Acceptance Criteria
- [x] oxlint config enforces cyclomatic complexity <= 10, max function length ~50 lines, max params <= 4, max nesting depth 3
- [x] `npm run lint` script exists and runs clean against the current scaffold
- [x] The config file contains a comment stating rule relaxations/overrides require explicit user permission before being made

### 001.7 Vitest test runner config

#### Description
Wire up Vitest as the project's test runner so every later TDD ticket has a working `npm test` from day one.

#### Acceptance Criteria
- [x] Vitest config exists and supports TypeScript test files under `/src`
- [x] `npm test` runs successfully with zero or placeholder tests present
- [x] A trivial placeholder test (e.g. `1 + 1 === 2`) passes, proving the runner is wired correctly

### 001.8 .env / secrets handling

#### Description
Set up gitignored local secrets/config via `.env`, loaded by the main process at startup, with a checked-in `.env.example` documenting expected keys.

#### Acceptance Criteria
- [x] `.env` is listed in `.gitignore`
- [x] `.env.example` exists, documenting expected keys (provider selection, Claude API key placeholder, etc.)
- [x] The main process loads `.env` at startup and the loaded values are not exposed to the renderer process

### 001.9 Local logging (no telemetry)

#### Description
Wire up local-only file logging (e.g. `electron-log`) for errors/diagnostics, with no network-based telemetry or crash reporting anywhere in the app.

#### Acceptance Criteria
- [x] A logging utility writes to a local log file on disk (e.g. under app userData)
- [x] At least one intentional error thrown during dev produces a corresponding log file entry
- [x] No telemetry/crash-reporting network call exists anywhere in the codebase (verified by review/grep for any such SDK)
