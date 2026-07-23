# EPIC: Local AI provider — Settings pick → download → run

Product goal: a player opens **Settings**, picks an AI model to try, the app **downloads** it (and acquires a local runtime if needed), then local inference **runs seamlessly** for core gameplay — no cloud API key, no manual path pasting, no separate terminal setup.

Technical spine: llama.cpp (`llama-server`) as a main-process-owned local HTTP provider behind the same registry interface as Claude/Player2. Research defaults live in [docs/research/llamacpp-local-runtime-2026-06-28.md](../../docs/research/llamacpp-local-runtime-2026-06-28.md).

Broken down into sub-tickets 020.1–020.20 (+ 020.21 oxlint/typecheck, 020.22 deadcode, 020.23 GPU runtime backend, 020.24 backend checkboxes, **020.25 first-run local LLM onboarding**, **020.26 uninstall remove local LLM**, **020.27 stop managed runtime before re-acquire**, **020.28 GPU/CPU radios**, **020.29 local campaign world ctx/max_tokens clamp**, **020.30 fail-fast world schema / no ×5 seed restart**, **020.31 log failed generation responses**, **020.32 merge split world JSON objects**, **020.33 coerce religious faction normalize**). This epic is done when all of them are.

020.1 llama.cpp local-process research spike · 020.2 local process lifecycle manager · 020.3 llama.cpp provider adapter · 020.4 local-provider config wiring + model swap · 020.5 local-provider retry/backoff + failure logging · 020.6 packaged local runtime + userData asset layout · 020.7 packaged/local-provider manual smoke (download path) · 020.8–020.16 smoke parity matrix · **020.17 Settings curated model catalog** · **020.18 in-app model download manager** · **020.19 local runtime discover/acquire** · **020.20 seamless apply from Settings (boot + lifecycle)** · **020.23 Vulkan/CPU runtime backend acquire** · **020.24 GPU/CPU backend checkboxes** · **020.25 first-run local LLM onboarding** · **020.26 uninstall remove local LLM** · **020.28 GPU/CPU radios** · **020.29 local campaign world ctx clamp** · **020.30 fail-fast world schema** · **020.31 log failed generation responses** · **020.32 merge split world JSON** · **020.33 coerce religious faction**

## Target user experience (v1)

1. Open Settings → choose **Local** (llama.cpp).
2. Pick a **recommended model** from a curated list (size / VRAM hints visible).
3. Click **Download** — progress in-app; weights land under app `userData` (not inside the installer `.exe`).
4. If `llama-server` is missing, the app **discovers** it on PATH or **acquires** a runtime binary into `userData` (same Settings surface).
5. Save / Apply → lifecycle starts, health becomes ready, gameplay uses the local provider with no `.env` editing and no manual file paths for the happy path.
6. Advanced users may still paste/browse custom paths or use attach mode (power-user escape hatch, not the primary path).

## Implementation status (rescoped 2026-07-18)

| Area | Status | Notes |
|------|--------|-------|
| Research + defaults | Done | `docs/research/llamacpp-local-runtime-2026-06-28.md` |
| Settings UI + persistence (mode/paths) | Done | Epic 016 — mode selector, manual paths, validation |
| Lifecycle manager | Done | `src/main/llamacpp/lifecycle.ts` — attach + managed, health poll, typed errors |
| Startup boot stage | Done | Persisted Settings drive boot/apply (020.20); `.env` override/fallback only |
| Provider adapter | Done | Dedicated llama/OpenAI-chat adapter (020.3) |
| Config wiring | Done | Paths/ctx/gpu + catalog/download apply (020.4, 020.17–020.18) |
| Retry/logging | Done | Global `withRetry` + llama-specific diagnostics (020.5) |
| Packaged / userData layout | Done | On-demand assets under `userData`; lean installer (020.6) |
| **Model catalog UI** | Done | 020.17 |
| **In-app GGUF download** | Done | 020.18 |
| **Runtime discover/acquire** | Done | 020.19 — PATH + optional fetch; winget remains a documented fallback |
| **GPU runtime backend** | Done | 020.23 — Vulkan default acquire; CPU selectable; CUDA/HIP BYO |
| **Runtime backend checkboxes** | Done | 020.24 — GPU/CPU checkboxes instead of dropdown |
| **First-run local LLM onboarding** | Done | 020.25 — ask local → GPU/CPU → auto download/setup; always-first-time in dev |
| **Uninstall local LLM cleanup** | Done | 020.26 — NSIS prompt (default Yes) removes `userData/llamacpp` only |
| **Stop before re-acquire** | Done | 020.27 — stop managed llama-server before runtime DLL replace |
| **GPU/CPU radios** | Done | 020.28 — radio controls matching app theme (replaces checkbox chrome) |
| **Local world ctx clamp** | Done | 020.29 — clamp max_tokens to ctx; fail fast on truncation |
| **Fail-fast world schema** | Done | 020.30 — no ×5 seed restart on stage schema failure; reshape world prose |
| **Log failed generation responses** | Done | 020.31 — attach/log raw schema-failure attempts for local debug |
| **Merge split world JSON** | Done | 020.32 — merge consecutive JSON objects from local world dumps |
| **Coerce religious faction** | Done | 020.33 — promote faith-linked faction to religious on medium/heavy |
| **Seamless Settings → ready** | Done | 020.20 |
| Smoke parity (020.7–020.16) | Pending | Still in `board/in-progress`; run after download happy path on reference model |

## Feasibility constraints (rescoped)

- **Installer stays lean.** Do **not** ship multi-GB `.gguf` weights (or a fat runtime bundle) inside the portable/NSIS `.exe`. Weights and optional runtime binaries are **downloaded on demand** into Electron `userData` after the user opts in from Settings.
- **OpenAI-compatible HTTP only.** Adapter targets `POST /v1/chat/completions` + `GET /health`. Structured JSON stays prompt + `tryParseJson` + agent retries — not llama.cpp JSON-schema mode in v1.
- **Boot-time readiness is the v1 gate.** Lifecycle at startup / after Apply (015 + 020.20); per-request lifecycle gates deferred unless smoke shows dispatch after `degraded`.
- **Smoke parity ≠ cloud narration quality.** 020.8–020.16 mirror 021 integration guarantees. Coherent prose on a 7B local model is best-effort.
- **Reference model for smoke + default catalog entry:** pin **Qwen2.5-7B-Instruct Q4_K_M** (8 GB+ VRAM or 16 GB+ RAM) in research doc + catalog.
- **Role-based model profiles (DM vs NPC)** remain post-v1; one active downloaded model is enough for epic close.
- **Attach mode + manual paths** remain supported for power users; they are not the primary UX.

## Smoke execution tiers

Run in order; do not start tier 2 until 020.7 passes.

1. **Gate (020.7):** Settings → download reference model (+ runtime if needed) → Apply → one real generation + one expected-failure path.
2. **Core loop (020.8–020.11):** campaign generation, character/party, combat, world persistence.
3. **Edge flows (020.12–020.16):** rest/level-up, currency, NPC promotion, death mode, restart integrity.

## Definition of done (rescoped)

- Happy path: Settings catalog → download → Apply → local provider ready → play, with no manual path entry and no `.env` requirement.
- Managed lifecycle works from persisted Settings; attach + custom paths still work as advanced options.
- Missing/partial download or missing runtime surfaces typed, actionable errors with recovery in Settings (retry download / acquire runtime).
- Dedicated llama adapter (or shared OpenAI-chat adapter) replaces the Player2 scaffold for `llamacpp` mode (020.3).
- Manual smoke tiers 1–3 pass on the reference catalog model.
- Packaging notes document: lean installer, `userData` asset layout, VRAM/RAM assumptions, and advanced BYO fallback.
