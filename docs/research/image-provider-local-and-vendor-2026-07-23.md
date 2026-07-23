# Image provider research spike (epic 152.1)

Date: 2026-07-23

## Local reference stack — stable-diffusion.cpp `sd-server`

| Item | Choice |
|------|--------|
| Runtime | [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp) **`sd-server`** (OpenAI-compatible HTTP) |
| Bind address | `127.0.0.1:8190` (loopback only) |
| Generate | `POST /v1/images/generations` — JSON body `{ prompt, size }` (e.g. `256x256`); response OpenAI-style `{ data: [{ b64_json }] }` |
| Health | `GET /v1/models` — **200** when weights loaded and server ready |
| Managed idle unload | **120_000 ms** (2 min) after last in-flight job completes; next paint cold-starts the server |
| userData layout | `{userData}/imagegen/models/` (catalog weights), `{userData}/imagegen/runtime/` (acquired `sd-server` binary) |
| Lean installer | **No** bundled SD runtime or weights in the `.exe`; acquire + download at first use (same pattern as llama.cpp **020.6**) |

### Reference catalog model

Matches `IMAGE_LOCAL_REFERENCE_MODEL_ID` in `src/shared/settings/imageLocalCatalog.ts`:

| Field | Value |
|-------|-------|
| id | `sd-turbo-onnx` |
| label | SD Turbo (ONNX, reference) |
| download size | ~650 MB (`680_000_000` bytes) |
| VRAM hint | ~4 GB (`4096` MB) |
| RAM hint | ~8 GB (`8192` MB) |

Dual-load note: Local LLM (Vulkan) + Local image on the same GPU typically needs **≥12 GB VRAM** or mitigations (CPU LLM, idle unload, cloud/Player2 images).

## Player2 (v1 — keep)

| Item | Value |
|------|-------|
| Endpoint | `POST {player2BaseUrl}/v1/image/generate` |
| Body | `{ prompt, width, height }` (e.g. 256×256 face tokens) |
| Response | `{ image: "<base64>" }` |
| Auth | None on loopback; default base URL `http://127.0.0.1:4315` |

## Cloud vendors → `ImageGenerateResult`

All adapters map HTTP success to `{ ok: true, mimeType, bytesBase64, prompt }` and failures to `{ ok: false, category, message }`.

### OpenAI

- `POST https://api.openai.com/v1/images/generations`
- Header: `Authorization: Bearer {openaiApiKey}`
- Body: `{ model, prompt, size: "256x256", response_format: "b64_json" }`
- Success: `data[0].b64_json` → PNG base64

### Gemini (Imagen)

- Generative Language API image endpoint for configured model (e.g. `imagen-3.0-generate-002`)
- Header: `x-goog-api-key: {geminiApiKey}`
- Map response bytes/base64 into `ImageGenerateSuccess`

### Grok (xAI)

- xAI images API for configured model (e.g. `grok-2-image`)
- Header: `Authorization: Bearer {grokApiKey}`
- Map response into `ImageGenerateSuccess`

## Claude

**No image adapter.** Claude is LLM-only in Settings; not listed as an image provider mode.

## Idle unload policy (152.5)

1. Track in-flight image jobs (queued + running).
2. When queue depth returns to **0**, start idle timer (**120 s** default, `DEFAULT_IMAGE_IDLE_UNLOAD_MS`).
3. On timer fire, stop managed `sd-server` to free VRAM.
4. **Never** stop while any job is in flight or queued.
5. Next `generateImage` cold-starts the runtime (acceptable latency).
6. Readiness gating (`isImageGenerationReady`) is **config-based** (Enable ON + assets/keys present), not “server currently loaded”.
