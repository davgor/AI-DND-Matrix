# EPIC: Local AI provider adapter (llama.cpp-first)

Build a local-first AI provider path that doesn't require a cloud API key for core gameplay: llama.cpp runs as a separate local process (owned by Electron's main process, never the renderer), exposed over loopback HTTP, and adapted behind the same provider interface Claude already implements — so model swap is a config change, not a code change. Research findings and recommended defaults live in [docs/research/llamacpp-local-runtime-2026-06-28.md](../../docs/research/llamacpp-local-runtime-2026-06-28.md).

Broken down into sub-tickets 020.1-020.16. This epic is done when all of them are.

020.1 llama.cpp local-process research spike · 020.2 local process lifecycle manager · 020.3 llama.cpp provider adapter · 020.4 local-provider config wiring + model swap · 020.5 local-provider retry/backoff + failure logging · 020.6 packaged local runtime wiring · 020.7 packaged local-provider manual smoke · 020.8 smoke parity: campaign generation (local) · 020.9 smoke parity: character + party creation (local) · 020.10 smoke parity: combat encounter (local) · 020.11 smoke parity: world-altering persistence (local) · 020.12 smoke parity: rest/level-up/homebrew (local) · 020.13 smoke parity: currency spend (local) · 020.14 smoke parity: NPC promotion (local) · 020.15 smoke parity: death mode execution (local) · 020.16 smoke parity: restart state integrity (local)

## Implementation status (2026-06-30)

| Area | Status | Notes |
|------|--------|-------|
| Research + defaults | Done | `docs/research/llamacpp-local-runtime-2026-06-28.md` |
| Settings UI + persistence | Done | Epic 016 — mode selector, paths, validation, startup hydration |
| Lifecycle manager | Mostly done | `src/main/llamacpp/lifecycle.ts` — attach + managed, health poll, typed errors |
| Startup boot stage | Done | Epic 015 — `createLlmBootStage` starts/polls llama before handoff |
| Provider adapter | Scaffold | `llamacpp` registry entry reuses `createPlayer2Provider` (same `/v1/chat/completions` shape) |
| Config wiring | Partial | Env + persisted settings cover base URL, paths, ctx/gpu; no model profiles yet |
| Retry/logging | Partial | Global `withRetry` wraps all providers; llama-specific diagnostics not added |
| Packaged runtime | Not verified | Path resolution works via settings; no bundled binary; manual smoke pending |
| Smoke parity (020.8-020.16) | Not started | Blocked on dedicated adapter + reference-model runbook |

## Feasibility constraints

- **No bundled llama-server or model in the `.exe`.** Users install `llama-server` (e.g. `winget install llama.cpp`) and supply a `.gguf` path. Packaged builds use the same settings-driven paths as dev — not a separate dev-only layout.
- **OpenAI-compatible HTTP only.** The adapter targets `POST /v1/chat/completions` + `GET /health`. Structured JSON is handled the same way as Player2/Claude today: prompt for JSON, then `tryParseJson` + agent-layer retries — not llama.cpp `response_format` / JSON-schema mode in v1.
- **Boot-time readiness is the v1 gate.** Lifecycle runs at startup (015); per-request lifecycle checks are deferred unless smoke shows dispatch after `degraded` state.
- **Smoke parity ≠ cloud narration quality.** Tickets 020.8-020.16 mirror 021's *integration* guarantees (engine authority, typed errors, no corrupt saves, reload without provider). Coherent prose on a 7B local model is best-effort, not a blocker.
- **Reference model required for smoke.** Document one pinned model + quant in the research doc / runbook (suggested starting point: **Qwen2.5-7B-Instruct Q4_K_M**, 8 GB+ VRAM or 16 GB+ RAM). Smokes run against that profile only.
- **Role-based model profiles (DM vs NPC)** are post-v1; 020.4 only needs default-path swap via config/settings.

## Smoke execution tiers

Run in order; do not start tier 2 until 020.7 passes.

1. **Gate (020.7):** packaged or dev build, local provider only, one real generation + one expected-failure path.
2. **Core loop (020.8-020.11):** campaign generation, character/party, combat, world persistence.
3. **Edge flows (020.12-020.16):** rest/level-up, currency, NPC promotion, death mode, restart integrity.

## Definition of done (revised)

- Managed and attach modes work with settings + `.env`, with actionable typed errors when runtime/model is missing.
- A dedicated llama adapter (or shared OpenAI-chat adapter) replaces the Player2 scaffold for `llamacpp` mode.
- Manual smoke tiers 1-3 pass on the reference model profile.
- Packaging notes document user prerequisites (binary install, model placement, VRAM/RAM assumptions).
