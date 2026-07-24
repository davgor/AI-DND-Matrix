# Image provider smoke (epic 152.11)

Manual checks for Settings image generation, campaign gates, and hub Resume blocking.

## Prerequisites

- Dev build: `npm run rebuild:electron` then `npm run dev` when exercising Electron paths.
- Research reference: `docs/research/image-provider-local-and-vendor-2026-07-23.md`

## 1. Enable OFF gate (default)

1. Fresh settings or **Enable image generation** unchecked.
2. Open **New campaign** — **Use generative tokens?** checkbox is disabled with helper text about enabling a ready image provider.
3. Create a campaign with generative tokens off — hub **Resume** works normally.

## 2. Cloud painter (OpenAI example)

1. Settings → LLM: set OpenAI API key.
2. Settings → **Image generation**: Enable ON, mode **Cloud — OpenAI**.
3. Save — status shows **Ready**.
4. New campaign — generative tokens checkbox enabled; create with tokens ON.
5. After play starts, confirm async portrait/token paint (non-blocking).

## 3. Player2

1. Run Player2 locally on loopback (default `http://127.0.0.1:4315`).
2. Settings → Image generation: Enable ON, mode **Player2 (local app)**.
3. Save — status **Ready** when URL valid.
4. Trigger a face token or PC icon generate — `POST /v1/image/generate` succeeds.

## 4. Local sd-server

1. Settings → Image generation: mode **Local sd-server**.
2. **Download local model** — progress → **Ready** under `userData/imagegen/models/`.
3. Acquire runtime if managed mode — binary under `userData/imagegen/runtime/`.
4. Enable ON, Save — status **Ready**.
5. Generate one portrait — `POST /v1/images/generations` to `127.0.0.1:8190`.

## 5. Hub Resume gate (mismatch)

1. Create or edit a campaign with **generative tokens ON** while image provider is ready.
2. Settings → disable image generation or leave not ready — Save.
3. Open campaign hub — banner: **Campaign requires an image provider**.
4. **Resume** on cast cards is disabled (greyed); **Create new character** also disabled.
5. Re-enable a ready image provider (or turn campaign generative tokens off) — banner clears; **Resume** works.

## 6. Post–local-LLM prompt (decline)

1. Complete first-run local LLM intro successfully.
2. When prompted **Set up local image generation now?** — choose **Not now**.
3. Confirm image Enable stays OFF; no download starts.
4. Relaunch app — prompt does not reappear (decline flag persisted).

## 7. Post–local-LLM prompt (accept)

1. Complete local LLM intro → choose **Yes** on image prompt.
2. Settings opens (or local image download rails start) — user can Enable when ready.

## 8. Idle unload cold-start

1. Local image Enable ON, managed sd-server running after a paint.
2. Wait **>2 minutes** with no queued/in-flight image jobs.
3. Confirm sd-server process stops (VRAM freed).
4. Trigger another portrait — cold-start succeeds (may take longer than warm path).
