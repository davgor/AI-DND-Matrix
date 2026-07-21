# EPIC: Automated e2e testing framework (mocked AI + dedicated CI)

Unit/integration Vitest covers engine, DB, IPC, and agents with `createScriptedProvider`, but the **Electron app shell** (main + preload + renderer) has no automated end-to-end path. Regressions like blank campaign pages, broken navigation, and IPC wiring gaps still slip past CI. Manual smoke (**021** / **138**) and local-provider parity (**020**) remain valuable for real-provider confidence — they are **not** a substitute for fast, deterministic PR gates.

This epic adds a **first-class automated e2e framework** that launches the real Electron app, drives UI flows, and **fully mocks all AI interactions** (text LLM and image generation) so CI never calls cloud or local model servers.

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Real LLM / image APIs in CI? | **Never.** Any outbound AI call is a test failure. |
| Replace 021 manual smoke? | **No.** 021/138 stay runbook-first for live providers; this epic is the mocked automation spine. |
| Same job as unit `pr-checks`? | **No.** Dedicated workflow/job so e2e flakiness, Electron install, and runtime do not block or slow unit shards. |
| Pixel / visual regression? | **Out of scope for v1.** Behavior + DOM/IPC assertions only. |

## Target architecture

```
npm run test:e2e
  └── Playwright (Electron) launches app with E2E harness flags
        │
        ├── Isolated userData / temp DB per run
        ├── Provider registry → scripted fixtures (extend mockHarness)
        ├── Image pipeline → deterministic stub (no network)
        └── Guard: fail fast if real provider HTTP is attempted
              │
              ▼
        Specs under e2e/ (critical-path smokes first)
              │
              ▼
        CI: .github/workflows/e2e.yml (own job, PR + main)
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Framework:** Playwright for Electron (`@playwright/test` + Electron launch). One runner, one config, documented `npm run test:e2e`. |
| 2 | **AI mock is mandatory.** E2E mode injects scripted text providers (reuse / extend `src/agents/providers/mockHarness.ts`) and stubs image generation. No API keys required to run the suite. |
| 3 | **Network guard.** In e2e mode, real cloud/local LLM and image HTTP must be unreachable or intercepted; attempting a live call fails the test with a clear error. |
| 4 | **Isolation.** Each run uses a fresh temp `userData` (and DB) so tests do not touch developer campaigns or leak state across specs. |
| 5 | **Dedicated CI.** New `.github/workflows/e2e.yml` (own job name) on PR + push to `main`, separate from sharded `pr-checks.yml` and `deadcode.yml`. Document how to run via `act` when Docker is available. |
| 6 | **Starter matrix, not full 021.** v1 automates a small critical path (app boot → settings/provider mock ready → open/create campaign shell → one play or hub assertion). Expanding coverage is follow-on tickets, not DoD for the framework itself. |
| 7 | **Fixtures as code.** Scripted AI responses live next to specs (or shared `e2e/fixtures/`); deterministic JSON/text, versioned in git. |
| 8 | **Delivery standards still apply** to harness code: TDD where logic is extractable; full `npm test` / lint / build / deadcode / act gates on implementation tickets. |

## Definition of done

- `npm run test:e2e` documented and green locally (Windows primary; Linux CI path works)
- E2E mode never requires real API keys; AI fully mocked with network guard
- `.github/workflows/e2e.yml` exists as its own CI job and is required-check-ready (name stable)
- At least one critical-path smoke spec passes in CI
- README (or `docs/runbooks/`) explains how e2e relates to unit tests and to **021** manual smoke
- Cross-link **138** so 021 remains runbook-first and does not claim to own this automation

140.1 Harness + Playwright Electron scaffold · 140.2 E2E AI mock injection + network guard · 140.3 Dedicated e2e CI workflow · 140.4 Critical-path smoke specs · 140.5 Docs + delivery gate

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **002** / **061** / **107** | Unit CI stays Vitest-sharded; this adds a sibling gate |
| **021** / **138** | Manual/live-provider smoke matrix — complementary, not replaced |
| **020** | Local llama smoke remains separate; e2e must not start llama-server |
| **055** | Campaign-create contract tests stay unit/fixture; e2e may later exercise create UI with mocked stages |
| **119** / **136** | Blank-page / ErrorBoundary bugs are prime e2e candidates once harness exists |
| **122** / **m001** | Image paths must use the e2e image stub when specs touch portraits |

## Out of scope (v1)

- Automating the full 021.x live-provider matrix
- Calling Claude / OpenAI / Gemini / Grok / Player2 / llama.cpp from e2e CI
- Visual/pixel regression, accessibility axe suites, multiplayer (**m002** / **m005**)
- Replacing Vitest unit or IPC integration tests
- macOS-only or packaged-installer e2e (dev `electron-vite` / built `out/` launch is enough for v1; packaging smokes stay manual)

## Sub-tickets

### 140.1 Playwright Electron harness scaffold

#### Description

Add Playwright + Electron launch config, `e2e/` folder layout, `npm run test:e2e`, and a trivial smoke that boots the app window and asserts a stable shell selector (e.g. app title or main chrome). No AI flows yet — prove the runner works.

#### Acceptance criteria

- [ ] Dev dependency + config committed; `npm run test:e2e` runs from repo root
- [ ] Spec launches Electron against this app (not a browser-only stub)
- [ ] Isolated temp `userData` (or equivalent) per run
- [ ] Trivial boot assertion passes locally

### 140.2 E2E AI mock injection + network guard

#### Description

Wire an e2e/test harness mode (env flag or launch arg) so main-process provider selection uses scripted fixtures instead of `createProviderRegistry` live adapters. Stub image generation the same way. Add a guard that fails loudly if a real AI HTTP call is attempted.

#### Acceptance criteria

- [ ] E2E mode requires no API keys
- [ ] Text LLM calls resolve from scripted fixtures (extend or wrap `mockHarness`)
- [ ] Image generation is stubbed when exercised
- [ ] Unit or harness test: live-call attempt → explicit failure
- [ ] Default `npm run dev` / production paths unchanged (mock only when e2e flag set)

### 140.3 Dedicated e2e CI workflow

#### Description

Add `.github/workflows/e2e.yml` with its own job (stable name), running on PR and push to `main`. Install deps, build as needed, run `npm run test:e2e`. Keep it independent of `pr-checks.yml` shards. Document `act` invocation alongside existing delivery gates.

#### Acceptance criteria

- [ ] Workflow file exists; job is not folded into unit test shards
- [ ] CI installs Electron/Playwright deps needed for headless/Linux runners
- [ ] Job fails when an e2e spec fails
- [ ] `[skip ci]` (or repo-equivalent) policy matches sibling workflows if applicable
- [ ] Runbook note for local `act` of `e2e.yml`

### 140.4 Critical-path mocked smoke specs

#### Description

Author the first real product smokes on the harness: e.g. cold boot → visible home/campaigns chrome; open settings (or equivalent) without provider errors; enter or create a campaign shell with mocked AI so no network is used. Keep the set small and stable — flake budget near zero.

#### Acceptance criteria

- [ ] ≥1 critical-path spec beyond trivial boot
- [ ] Specs pass with AI fully mocked (no keys, no live HTTP)
- [ ] Fixtures checked into `e2e/fixtures/` (or agreed path)
- [ ] Specs green in the e2e CI job

### 140.5 Docs + board/README cross-links + delivery gate

#### Description

Document how to run e2e locally and in CI; clarify boundaries vs Vitest and vs **021**/**138**. Update README CI section to mention the e2e job. Land delivery gate on harness/docs changes.

#### Acceptance criteria

- [ ] README or runbook documents `npm run test:e2e` and the e2e workflow
- [ ] Explicit note: e2e = mocked AI automation; 021 = live-provider runbook smoke
- [ ] **138** / **021** cross-link updated so ownership is clear
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` for pr-checks + deadcode (+ e2e workflow once present) pass
