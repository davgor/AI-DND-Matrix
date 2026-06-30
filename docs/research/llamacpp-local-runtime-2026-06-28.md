# llama.cpp local runtime research (2026-06-28)

## Goal
Define the fastest safe path to run local LLM inference inside this Electron app without cloud API keys.

## Implementation status (2026-06-30)

| Component | Location | Status |
|-----------|----------|--------|
| Lifecycle manager (attach + managed) | `src/main/llamacpp/lifecycle.ts` | Shipped |
| Startup boot stage | `src/main/startup/bootStages.ts` | Shipped |
| Settings UI + persistence | Epic 016 | Shipped |
| Provider adapter | `src/agents/providers/selectProvider.ts` | **Scaffold** — reuses Player2 OpenAI-chat client |
| Dedicated adapter + smoke matrix | Epic 020 tickets 020.3, 020.7-020.16 | Pending |

## Repo-fit conclusions
- Keep provider execution in Electron main process.
- Do not run inference from renderer.
- Integrate as a new provider adapter selected by config in existing provider registry flow.
- Use a separate local process (`llama-server`) managed by the app lifecycle manager.
- **Do not bundle** `llama-server` or model weights in the portable `.exe` for v1.

## Verified llama.cpp server facts
- Windows binary: `llama-server.exe`.
- Default bind: `127.0.0.1:8080`.
- Ready check endpoint: `GET /health` (or `/v1/health`).
  - `200 {"status":"ok"}` means ready.
  - `503 ... unavailable_error` means model still loading.
- OpenAI-compatible chat endpoint: `POST /v1/chat/completions`.
- OpenAI-compatible model metadata endpoint: `GET /v1/models`.
- Structured outputs via `response_format` exist in llama.cpp but **are not used in v1** — agents prompt for JSON and parse with `tryParseJson` (same as Player2/Claude).

## Reference model for smoke tests

Pin one profile for all 020.8-020.16 manual smokes so results are comparable:

| Field | Suggested value |
|-------|-----------------|
| Model | `Qwen2.5-7B-Instruct` (or similar recent 7B instruct) |
| Quant | `Q4_K_M` |
| Context (`-c`) | `8192` (match `LLAMA_CPP_CTX_SIZE`) |
| GPU | `--n-gpu-layers all` when VRAM ≥ 8 GB; otherwise reduce layers or use CPU |
| RAM fallback | 16 GB+ system RAM if running CPU-only |

Larger models (13B+) may work but are not the v1 acceptance bar — integration smokes should pass on the 7B profile above.

## First-pass runtime command (managed mode)
```powershell
llama-server.exe --host 127.0.0.1 --port 8080 -m C:\models\your-model.gguf -c 8192 --n-gpu-layers all
```

## First-pass config contract
- `AGENT_PROVIDER=llamacpp`
- `LLAMA_CPP_BASE_URL=http://127.0.0.1:8080`
- `LLAMA_CPP_SERVER_PATH=<path to llama-server.exe>`
- `LLAMA_CPP_MODEL_PATH=<path to .gguf>`
- `LLAMA_CPP_CTX_SIZE=8192`
- `LLAMA_CPP_GPU_LAYERS=all`
- `LLAMA_CPP_START_MODE=managed|attach`

Settings UI (016) mirrors these fields; persisted settings override `.env` at runtime.

## Provider mapping for this codebase
- `Provider.generate(prompt, context)` maps to `/v1/chat/completions`:
  - system message from `context.systemPrompt` (if present)
  - user message from `prompt`
  - max tokens from `context.maxTokens`
- Return `choices[0].message.content` as provider output string.
- JSON-heavy flows (campaign generation, etc.) rely on agent-layer `tryParseJson` + retry loops — not provider-side JSON schema.

## Lifecycle recommendations
- Process states: stopped, starting, ready, degraded, stopping.
- Poll `/health` until ready or startup timeout.
- Treat `503` as loading, not terminal error.
- On stop, attempt graceful termination first, then force-kill fallback (force-kill not yet implemented).

## Packaging recommendations
- Hybrid strategy:
  - **managed** mode if executable path is configured and valid
  - **attach** mode if user already runs server externally
- Keep loopback bind default for security.
- Document user prerequisites clearly (runtime binary + model file) — see Settings install hint (`winget install llama.cpp`).

## Risks and mitigations
- Model load latency can be high:
  - mitigate with startup progress messaging and health polling (015 loading screen).
- VRAM mismatch by model size:
  - mitigate with profile-based config and explicit typed config errors; document reference quant.
- Runtime missing in packaged install:
  - mitigate with actionable setup guidance and attach-mode fallback — not by embedding the binary.
- Weaker JSON adherence on small local models:
  - mitigate with existing agent retry/normalize paths; smoke tests check integration integrity, not prose quality.
- Player2 adapter scaffold hides llama-specific errors:
  - replace with dedicated or shared OpenAI-chat adapter (020.3).

## Sources
- https://raw.githubusercontent.com/ggml-org/llama.cpp/master/tools/server/README.md
- https://raw.githubusercontent.com/ggml-org/llama.cpp/master/docs/build.md
- https://raw.githubusercontent.com/ggml-org/llama.cpp/master/docs/install.md
