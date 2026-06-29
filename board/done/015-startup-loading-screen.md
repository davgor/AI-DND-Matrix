# EPIC: Startup loading screen (LLM + DB boot)

Build a real game-style loading flow that appears on app startup, blocks gameplay until core systems are ready, and communicates boot progress clearly to the player.

Broken down into sub-tickets 015.1-015.9. This epic is done when all of them are.

015.1 startup boot contract + readiness states · 015.2 loading screen UI + game-style presentation · 015.3 startup orchestrator (main process + IPC) · 015.4 DB boot stage (open/migrate/health) · 015.5 LLM boot stage (launch/health/warmup) · 015.6 progress telemetry + stage messaging · 015.7 boot failure handling + retry UX · 015.8 startup handoff transition to app shell · 015.9 startup smoke test (dev + packaged)

## Sub-tickets

### 015.1 Startup boot contract + readiness states

#### Description
Define the startup contract and stage model used by main/preload/renderer so loading behavior is deterministic and testable.

#### Acceptance Criteria
- [x] A typed startup state model exists (for example: idle, booting, waitingDb, waitingLlm, ready, failed)
- [x] Required readiness gates are defined and documented for DB and provider runtime
- [x] Startup emits typed progress/status events over IPC with stable payload shape
- [x] Unit tests validate state transitions and illegal transition rejection

### 015.2 Loading screen UI + game-style presentation

#### Description
Create a full-screen loading experience that feels like a game startup screen, with clear stage labels and visible progress.

#### Acceptance Criteria
- [x] Startup renders a dedicated loading screen before interactive views are available
- [x] UI includes stage label, progress indicator, and short status text (for example: "Booting narrative engine", "Loading campaign database")
- [x] Visual design reads as an intentional game loading screen, not a generic blank/skeleton screen
- [x] Loading UI is responsive on supported window sizes and does not overlap/break

### 015.3 Startup orchestrator (main process + IPC)

#### Description
Implement a startup orchestrator in main process that runs boot stages in order and streams progress events to renderer.

#### Acceptance Criteria
- [x] Main-process startup orchestrator executes defined boot stages in deterministic order
- [x] Renderer receives progress events through preload-safe IPC APIs (no direct node access in renderer)
- [x] Orchestrator can be awaited by app shell to block ready-state until boot completes
- [x] Unit tests verify normal path and stage failure propagation

### 015.4 DB boot stage (open/migrate/health)

#### Description
Add a database boot stage that validates DB readiness before gameplay routes are enabled.

#### Acceptance Criteria
- [x] Startup stage opens DB connection and runs required migrations/checks
- [x] Stage reports progress and completion/failure back to orchestrator
- [x] Failure path returns typed boot error with user-actionable message
- [x] Stage is covered by tests for success and migration/connection failure

### 015.5 LLM boot stage (launch/health/warmup)

#### Description
Add an LLM boot stage that ensures the selected provider runtime is available and ready before AI-backed flows begin.

#### Acceptance Criteria
- [x] Startup stage initializes provider runtime readiness check (llama.cpp-first path)
- [x] For managed mode, runtime launch + health polling is completed before ready
- [x] For attach mode, health check validates existing runtime availability
- [x] Stage emits typed progress/failure events and does not crash app on timeout/unreachable runtime

### 015.6 Progress telemetry + stage messaging

#### Description
Expose boot progress as stage-based telemetry and friendly player-facing loading text.

#### Acceptance Criteria
- [x] Orchestrator reports stage index/total and stage-specific status payloads
- [x] Renderer maps technical stages to player-friendly messages without leaking sensitive/internal paths
- [x] Progress indicator updates across stages and ends at ready state without regressions/jumps backward
- [x] Unit/UI tests cover event-to-UI mapping for at least DB, LLM, and ready states

### 015.7 Boot failure handling + retry UX

#### Description
Design resilient startup failure behavior with retry/recover actions so users are not stranded on startup errors.

#### Acceptance Criteria
- [x] Loading screen handles boot failures with clear error category (DB, runtime, config, unknown)
- [x] User can trigger retry without full app restart when failure is recoverable
- [x] Non-recoverable failures provide actionable guidance
- [x] Failure and retry flows are tested and do not leave orchestrator in invalid state

### 015.8 Startup handoff transition to app shell

#### Description
Implement clean transition from loading screen to normal app shell once boot is complete.

#### Acceptance Criteria
- [x] When startup reaches ready, loading screen transitions once into app shell with no flicker/re-entry loop
- [x] App shell interactive actions remain disabled until ready is confirmed
- [x] Transition preserves selected route/start destination semantics
- [x] Unit or integration test verifies single handoff behavior

### 015.9 Startup smoke test (dev + packaged)

#### Description
Validate startup loading behavior end-to-end in both development and packaged app contexts.

#### Acceptance Criteria
- [x] Dev-mode smoke confirms loading screen appears, DB stage runs, LLM stage runs, then handoff to app shell
- [x] Packaged-mode smoke confirms same behavior for downloaded users
- [x] At least one expected-failure smoke (runtime missing/unreachable) shows failure UX and retry path
- [x] Smoke runbook documents setup, steps, and observed outcomes
