# EPIC: Local AI provider — Settings pick → download → run

Product goal: a player opens **Settings**, picks an AI model to try, the app **downloads** it (and acquires a local runtime if needed), then local inference **runs seamlessly** for core gameplay — no cloud API key, no manual path pasting, no separate terminal setup.

Technical spine: llama.cpp (`llama-server`) as a main-process-owned local HTTP provider behind the same registry interface as Claude/Player2. Research defaults live in [docs/research/llamacpp-local-runtime-2026-06-28.md](../../docs/research/llamacpp-local-runtime-2026-06-28.md).

## Scope

| # | Slice | Status |
|---|-------|--------|
| 020.1–020.6 | Research spike, lifecycle manager, provider adapter, config wiring/model swap, retry/backoff logging, packaged userData asset layout | Done |
| 020.17–020.20 | Settings curated model catalog, in-app GGUF download manager, local runtime discover/acquire, seamless Settings → ready lifecycle | Done |
| 020.21–020.22 | Oxlint/typecheck pass, deadcode cleanup | Done |
| 020.23–020.28 | GPU/CPU runtime backend (Vulkan default), backend checkboxes → radios, first-run onboarding, uninstall cleanup, stop-before-reacquire | Done |
| 020.29–020.33 | Local-model world-gen hardening: ctx/max_tokens clamp, fail-fast schema (no ×5 restart), failed-generation logging, split-JSON merge, religious-faction coercion | Done |
| 020.7–020.16 | Manual smoke parity matrix (packaged download happy path + core loop + edge flows) | Dropped — not executed; local provider ships on the strength of 020.1–020.33 without a formal smoke pass |

## Definition of done

- Happy path (Settings catalog → download → Apply → local provider ready → play, no manual paths, no `.env`) — delivered.
- Managed lifecycle from persisted Settings; attach + custom paths remain supported for power users — delivered.
- Missing/partial download or runtime surfaces typed, actionable, recoverable errors in Settings — delivered.
- Dedicated llama adapter replaces the Player2 scaffold for `llamacpp` mode — delivered.
- Manual smoke tiers 1–3 (020.7–020.16) — dropped, not run.
