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
- **Do not embed** multi-GB model weights (or a fat runtime) in the portable/installer `.exe`. Epic 020 (rescoped) downloads weights on demand into `userData` from Settings; runtime is discovered on PATH or acquired into `userData` — not shipped inside the game installer.

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
- Primary UX (epic 020 rescoped): Settings catalog → in-app GGUF download → runtime discover/acquire → Apply → managed lifecycle.
- Hybrid strategy still applies:
  - **managed** mode when server + model paths resolve (downloaded `userData` assets or advanced BYO paths)
  - **attach** mode if the user already runs a server externally
- Keep loopback bind default for security.
- Keep the installer lean; store downloaded models/runtime under Electron `userData`.
- Manual `winget install llama.cpp` / GitHub binary remains an advanced fallback, not the happy path.

### userData asset layout (020.6)

Relative to Electron `app.getPath('userData')` (or `.data/` in unpackaged dev):

```
{userData}/llamacpp/
  models/{catalogModelId}.gguf   # curated downloads (020.18)
  runtime/llama-server[.exe]     # acquired runtime (020.19)
settings.json                    # persisted Settings including catalog id + download state
```

- Absolute BYO `llamaCppServerPath` / `llamaCppModelPath` still override when present on disk.
- Reference catalog model for smoke: **Qwen2.5-7B-Instruct Q4_K_M** (≈8 GB+ VRAM or 16 GB+ RAM CPU fallback).
- Resolution helpers live in `src/main/llamacpp/paths.ts` (`resolveLlamaCppAssetPaths`).
- **Uninstall (Windows NSIS, 020.26):** the Setup uninstaller prompts to remove `userData/llamacpp` (default **Yes**). Campaign saves / settings outside that folder are kept. Auto-update / upgrade (`isUpdated`) skips the prompt so models survive version bumps. Portable `.exe` and macOS DMG have no NSIS uninstaller — delete `{userData}/llamacpp` manually if reclaiming disk.

### Runtime discover / acquire (020.19)

1. Discover: last-known Settings path → `userData/llamacpp/runtime/llama-server[.exe]` → PATH (`where` / `which`).
2. Acquire (Windows v1): download pinned **Vulkan** zip by default (`resolveWindowsRuntimeZipUrl('vulkan')`), or CPU zip when Settings backend is `cpu`; extract with `tar`, install full package into `userData/llamacpp/runtime/`.
3. Advanced fallback only: CUDA/HIP GitHub zips, `winget install llama.cpp`, or manual path — not required for the happy path.

## Risks and mitigations
- Model load latency can be high:
  - mitigate with startup progress messaging and health polling (015 loading screen).
- VRAM mismatch by model size:
  - mitigate with catalog size/VRAM hints, profile-based config, and typed config errors; pin reference quant for smoke.
- Runtime or model missing in packaged install:
  - mitigate with in-app acquire/download + Settings recovery; attach-mode and BYO paths as escape hatches — not by embedding multi-GB weights in the `.exe`.
- Download failures / partial files:
  - mitigate with progress IPC, cancel, checksum, and never marking partial files ready (020.18).
- Weaker JSON adherence on small local models:
  - mitigate with existing agent retry/normalize paths; smoke tests check integration integrity, not prose quality.
- Player2 adapter scaffold hides llama-specific errors:
  - replace with dedicated or shared OpenAI-chat adapter (020.3).

## Sources
- https://raw.githubusercontent.com/ggml-org/llama.cpp/master/tools/server/README.md
- https://raw.githubusercontent.com/ggml-org/llama.cpp/master/docs/build.md
- https://raw.githubusercontent.com/ggml-org/llama.cpp/master/docs/install.md
