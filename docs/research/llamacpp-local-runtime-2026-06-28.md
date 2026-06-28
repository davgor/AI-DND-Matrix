# llama.cpp local runtime research (2026-06-28)

## Goal
Define the fastest safe path to run local LLM inference inside this Electron app without cloud API keys.

## Repo-fit conclusions
- Keep provider execution in Electron main process.
- Do not run inference from renderer.
- Integrate as a new provider adapter selected by config in existing provider registry flow.
- Use a separate local process (`llama-server`) managed by the app lifecycle manager.

## Verified llama.cpp server facts
- Windows binary: `llama-server.exe`.
- Default bind: `127.0.0.1:8080`.
- Ready check endpoint: `GET /health` (or `/v1/health`).
  - `200 {"status":"ok"}` means ready.
  - `503 ... unavailable_error` means model still loading.
- OpenAI-compatible chat endpoint: `POST /v1/chat/completions`.
- OpenAI-compatible model metadata endpoint: `GET /v1/models`.
- Structured outputs are supported via response-format/json-schema style options.

## First-pass runtime command (managed mode)
```powershell
llama-server.exe --host 127.0.0.1 --port 8080 -m C:\models\your-model.gguf -c 8192 --n-gpu-layers all
```

## First-pass config contract (proposed)
- `AGENT_PROVIDER=llamacpp`
- `LLAMA_CPP_BASE_URL=http://127.0.0.1:8080`
- `LLAMA_CPP_SERVER_PATH=<path to llama-server.exe>`
- `LLAMA_CPP_MODEL_PATH=<path to .gguf>`
- `LLAMA_CPP_CTX_SIZE=8192`
- `LLAMA_CPP_GPU_LAYERS=all`
- `LLAMA_CPP_START_MODE=managed|attach`

## Provider mapping for this codebase
- `Provider.generate(prompt, context)` maps to `/v1/chat/completions`:
  - system message from `context.systemPrompt` (if present)
  - user message from `prompt`
  - max tokens from `context.maxTokens`
- Return `choices[0].message.content` as provider output string.

## Lifecycle recommendations
- Process states: stopped, starting, ready, degraded, stopping.
- Poll `/health` until ready or startup timeout.
- Treat `503` as loading, not terminal error.
- On stop, attempt graceful termination first, then force-kill fallback.

## Packaging recommendations
- Start with hybrid strategy:
  - managed mode if executable path is configured and valid
  - attach mode if user already runs server externally
- Keep loopback bind default for security.
- Document user prerequisites clearly (runtime binary + model file).

## Risks and mitigations
- Model load latency can be high:
  - mitigate with startup progress messaging and health polling.
- VRAM mismatch by model size:
  - mitigate with profile-based config and explicit typed config errors.
- Runtime missing in packaged install:
  - mitigate with actionable setup guidance and attach-mode fallback.

## Sources
- https://raw.githubusercontent.com/ggml-org/llama.cpp/master/tools/server/README.md
- https://raw.githubusercontent.com/ggml-org/llama.cpp/master/docs/build.md
- https://raw.githubusercontent.com/ggml-org/llama.cpp/master/docs/install.md
