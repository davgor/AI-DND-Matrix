# EPIC: Image provider Settings — select / download / gate generative tokens

Product goal: players configure a real **image provider** in Settings (cloud endpoints that can paint, Player2, or a curated **local** download+run path on rails like epic **020**). Campaign **Use generative tokens?** and other generative-image controls stay **disabled** until an image provider is configured and enabled. Existing token pipelines (**122** / **123** / **139** / **144**) swap the placeholder mock for the selected provider.

Promotes the **provider + fallback** slice of moonshot **m001** (m001.1) into committed backlog. Scene/region/background painting (**m001.2–m001.5**) stays out of scope.

Depends on: shared `ImageProvider` contract (`src/shared/imageGeneration/`), schedulers from **122**/**123**/**139**/**144**, Settings patterns from **113** / **020**.

Broken down into sub-tickets **152.1–152.13**. This epic is done when all of them are.

152.1 research spike (local image runtime + vendor image APIs) · 152.2 Settings image-provider model + persistence · 152.3 cloud/Player2 image adapters · 152.4 local catalog + in-app download · 152.5 local runtime acquire + lifecycle (idle unload) · 152.6 Settings UI (select / download / enable) · 152.7 readiness + validation · 152.8 wire schedulers to real provider · 152.9 gate campaign / character generative controls · 152.10 VRAM dual-load UX hints · 152.11 smoke runbook · 152.12 delivery gate · **152.13 post–local-LLM image-provider prompt**

## Target user experience (v1)

1. Open **Settings → Image generation** (distinct from LLM mode).
2. Choose a provider that can paint images:
   - **OpenAI / Gemini / Grok** — reuse stored API keys from LLM Settings when present; require key + optional image-model id.
   - **Player2** — local app endpoint (image path confirmed in 152.1).
   - **Local** — curated small diffusion (or equivalent) catalog → **Download** → app acquires runtime into `userData` → managed lifecycle (mirror **020** rails).
3. Toggle **Enable image generation** ON only when the selected provider validates ready.
4. **After Local LLM is set up** (first-run / Settings happy path from **020.25**): prompt the user to also set up the **local image provider**. Accept → continue local image download/runtime rails. **Decline → image provider Enable stays OFF** (no partial local image install required).
5. Campaign create / Campaign Review: **Use generative tokens?** is disabled (unchecked, not toggleable) when image generation is OFF or the selected provider is not ready; helper text explains why.
6. Character icon **Generate** / **Regenerate** (**144**) follows the same gate (disabled + reason when image provider unavailable).
7. **Hub resume gate:** if a campaign already has generative tokens ON (`generativeTokensEnabled`) but Settings image generation is disabled or not ready, the campaign hub shows a clear banner: **“Campaign requires an image provider”**, and each character **Resume** button is greyed out / disabled until the image provider is enabled and ready again. (Turning the campaign flag off, or fixing Settings, clears the block.)
8. When enabled + ready, token jobs call the real `ImageProvider` (non-blocking, existing fallbacks on failure). Local runtime may cold-start if previously idled out.

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Image provider ≠ LLM mode.** Selecting Claude or llama.cpp for agents does not imply image painting. Image Settings is its own mode + enable flag. |
| 2 | **Image-capable providers only.** v1 selectable painters: OpenAI, Gemini, Grok, Player2, Local. **Claude is not an option** (no image-generation API). |
| 3 | **On-rails local path.** Local mirrors **020**: curated catalog with size/VRAM hints, in-app download to `userData`, optional runtime acquire, Apply → health ready. No manual terminal as the happy path. Advanced attach/custom URL may exist as escape hatch. |
| 4 | **Lean installer.** Do not ship multi-GB image weights or fat runtimes in the `.exe`; download on demand after opt-in. |
| 5 | **Hard gate on generative UI.** Missing config, failed validation, or Enable OFF → campaign generative-tokens control disabled; PC Generate/Regenerate disabled. No silent mock paint when the user thinks generation is on. |
| 6 | **Hub blocks Resume when campaign requires images.** Campaign with `generativeTokensEnabled` + image provider Enable OFF / not ready → hub banner **“Campaign requires an image provider”** and character **Resume** disabled (greyed out). Not a soft warning. |
| 7 | **Mock remains tests-only.** Production schedulers use the configured provider when Enable is ON and ready; when OFF/not ready, no enqueue (UI already gated). Unit tests keep `createMockImageProvider`. |
| 8 | **Token job failures stay non-blocking.** Provider errors mid-play → typed failure + letter/empty fallbacks; never hang create/play. Resume gate (decision 6) is intentional blocking before enter-play. |
| 9 | **VRAM honesty.** Local catalog + Settings copy warn that dual-load with a GPU LLM may need unload/CPU LLM or ≥12 GB VRAM (see research). |
| 10 | **Post–local-LLM prompt.** Once Local LLM setup completes, prompt for local image provider setup. Decline → image provider Enable **OFF** (and stay off until the user opts in later from Settings). |
| 11 | **Local idle unload.** Tear down / stop the managed local image runtime after an idle timer when the job queue is empty. Cold start on next job is acceptable. **Never** tear down while jobs are queued or in flight. |

## Definition of done

- Settings persists image provider mode, enable flag, cloud/Player2/local fields; validation rejects incomplete configs when Enable is ON
- Adapters implement `ImageProvider` for OpenAI, Gemini, Grok, Player2 (per 152.1 contracts), and Local
- Local catalog → download → runtime acquire → lifecycle ready without manual path entry on the happy path
- Local runtime idles out (stop/unload) when the queue is empty after the idle timer; does not stop mid-queue; cold start on next job is OK
- After Local LLM setup, user is prompted for local image provider; decline leaves image Enable OFF
- Campaign **Use generative tokens?** and PC icon Generate/Regenerate disabled when image provider Enable is OFF or not ready; enabled when ready
- Campaign hub: when campaign generative tokens are ON but image provider is OFF/not ready, banner **“Campaign requires an image provider”** and character **Resume** is disabled until Settings is fixed (or campaign flag turned off)
- Schedulers (**122**/**123**/**139**/**144**) use the live provider; placeholder PNG mock is not the production default when Enable is ON
- Smoke runbook covers cloud key path, Player2 path, local download path, hub Resume gate, post-LLM prompt decline, and idle unload
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; **act** CI (`pr-checks`, `deadcode`) succeeds

## Relationship to other epics

| Epic / moonshot | Integration |
|-----------------|-------------|
| **m001** / **m001.1** | This epic **promotes** the shared provider + fallback architecture into the main backlog |
| **020** / **020.25** | UX/lifecycle pattern for local rails; image prompt hooks after Local LLM setup completes |
| **113** | Multi-cloud Settings keys reused for OpenAI/Gemini/Grok image calls |
| **122** / **123** / **139** / **144** | Consumers; replace production mock wiring; honor new readiness gate |
| **016** / Settings intro | Extended by **152.13** for post–local-LLM image prompt |

## Out of scope (this epic)

- Scene / region / DM / player-view background generation (**m001.2–m001.5**)
- Making Claude an image provider
- Using llama.cpp chat GGUFs (e.g. Qwen Instruct) as image painters
- Guaranteeing dual GPU load of Local LLM + Local image on 8 GB cards
- Changing token framing/prompt quality beyond what adapters need
- Remote-play image routing (**m005**)

## Sub-tickets

### 152.1 — Research spike: local image runtime + vendor image APIs

Pin the local reference stack (runtime binary, API shape, reference model id, VRAM/RAM table) in `docs/research/`. Confirm Player2 image endpoint(s) against a running app. Document OpenAI / Gemini / Grok request/response mapping into `ImageGenerateResult`.

#### Acceptance criteria

- [x] Research doc checked in with recommended local runtime + one reference catalog model (size, VRAM, RAM)
- [x] Player2 image capability and path documented (or explicitly “unavailable → drop from v1 selectable list”)
- [x] Cloud vendor endpoints and auth headers summarized for adapter implementers
- [x] Recommended idle-unload timer default documented (cold start acceptable)

### 152.2 — Settings image-provider types, defaults, persistence

Add `ImageProviderSettings` (mode, enable flag, per-provider fields, local catalog/download state) to Settings persistence alongside LLM provider settings. Defaults: Enable **OFF**; mode unset or safe default that does not imply ready.

#### Acceptance criteria

- [x] Round-trip persist/load unit tests for image settings
- [x] Redaction rules for any secrets (reuse cloud keys; do not duplicate plaintext in logs)
- [x] Defaults keep generative painting OFF on fresh install

### 152.3 — Cloud + Player2 `ImageProvider` adapters

Implement adapters that satisfy `ImageProvider.generateImage` for each v1-selected remote/local-app painter from 152.1.

#### Acceptance criteria

- [x] Unit tests with mocked HTTP for success + typed failure categories (`provider_unavailable`, `timeout`, `policy_rejection`, etc.)
- [x] Adapters map bytes/mime into `ImageGenerateSuccess`
- [x] Claude has no adapter

### 152.4 — Local curated catalog + in-app download

Settings catalog for local image weights (size / VRAM hints). Download manager writes under `userData` (not the installer), with progress + ready/failed states (pattern from **020.17** / **020.18**).

#### Acceptance criteria

- [x] Catalog entry for the 152.1 reference model
- [x] Download progress + failure recovery tested
- [x] Assets land under documented `userData` layout

### 152.5 — Local runtime acquire + lifecycle (idle unload)

Discover/acquire the local image runtime into `userData`; managed start/stop/health analogous to llama lifecycle. Stop-before-replace if binaries are swapped.

**Idle policy:** after the job queue is empty, start an idle timer; on expiry, stop/unload the managed runtime (free VRAM). Next job cold-starts the runtime. **Never** stop while any job is queued or in flight. Idle timer duration pinned in research doc (tunable constant OK).

#### Acceptance criteria

- [x] Lifecycle unit tests: start, health ready, stop, typed errors when missing
- [x] Apply from Settings boots managed runtime when Local + Enable ON (or deferred until first job — document choice; cold start OK either way)
- [x] Idle timer stops runtime only when queue depth is 0; tests prove no stop while jobs pending/in flight
- [x] After idle stop, next `generateImage` cold-starts successfully
- [x] Lean-installer constraint documented (no fat runtime in `.exe`)

### 152.6 — Settings UI: provider select, download, enable

Renderer Settings section: provider radios/select, cloud key reuse / Player2 URL, local catalog + Download, Enable toggle, status (Ready / Needs setup / Failed).

#### Acceptance criteria

- [x] Component tests cover provider switch + enable disabled until validation passes
- [x] Local download controls mirror LLM section patterns (progress, Ready)
- [x] Copy states Claude is LLM-only and not listed as an image provider

### 152.7 — Readiness helper + validation

Single shared helper: `isImageGenerationReady(settings) → boolean` (+ reason code). Validation errors when Enable ON but config incomplete.

#### Acceptance criteria

- [x] Unit tests for each mode: ready / missing key / missing download / runtime down / Enable OFF
- [x] IPC or settings snapshot exposes readiness to renderer without leaking secrets
- [x] Idle-stopped local runtime still counts as **ready** for gating (Enable ON + assets present); cold start happens on demand — “not ready” is config/Enable, not “currently unloaded”

### 152.8 — Wire token schedulers to configured provider

Replace production `mockPlaceholderImageProvider` defaults in NPC / creature / companion / PC icon paths with a resolver that returns the configured adapter when ready.

#### Acceptance criteria

- [x] Scheduler tests prove real provider is invoked when ready; no enqueue path relies on 1×1 placeholder as success paint when Enable ON
- [x] When not ready, enqueue is skipped (defense in depth even if UI gated)
- [x] Failure still non-blocking with existing fallbacks

### 152.9 — Gate campaign + character generative controls (+ hub Resume)

Campaign start + Campaign Review **Use generative tokens?** disabled when not ready. Character creation / sheet **Generate** and **Regenerate** disabled with the same readiness signal. Turning image provider off later does not delete existing assets.

**Mismatch case:** campaign already has `generativeTokensEnabled === true` and Settings image generation is disabled or not ready → campaign hub shows banner copy **“Campaign requires an image provider”** and greys out / disables **Resume** on each character card (reuse `actionsDisabled`-style pattern from obituary blocking). Clearing the mismatch (enable+ready image provider, or turn campaign generative tokens off) restores Resume.

#### Acceptance criteria

- [x] Renderer tests: control disabled + helper text when not ready; enabled when ready
- [x] Cannot persist `generativeTokensEnabled: true` on create/edit when not ready (server-side guard)
- [x] PC icon Generate/Regenerate disabled when not ready
- [x] Hub shows **“Campaign requires an image provider”** when campaign generative tokens ON and image provider OFF/not ready
- [x] Hub character **Resume** is disabled (greyed out) in that mismatch state; re-enabled when ready or campaign flag off
- [x] Component tests cover mismatch / cleared-mismatch Resume behavior

### 152.10 — Dual-load / VRAM UX hints

When LLM mode is Local (GPU) and image mode is Local, Settings shows an explicit warning about VRAM contention and suggested mitigations (CPU LLM, unload, or cloud/Player2 images). Idle unload (152.5) is the primary automatic mitigation; copy may mention it.

#### Acceptance criteria

- [x] Warning visible only for the dual-local GPU case (unit/component test)
- [x] Hint text references research ballparks (not a hard block)

### 152.11 — Manual smoke runbook

`docs/runbooks/image-provider-smoke.md`: Enable OFF gate; one cloud painter; Player2 if in v1; local download → one face-token or PC icon success; failure/fallback path; hub mismatch (campaign tokens ON + image provider OFF → banner + Resume disabled); post–local-LLM prompt accept/decline; idle unload then cold-start paint.

#### Acceptance criteria

- [x] Runbook checked in and linked from epic / README runbooks list if one exists
- [x] Steps match shipped Settings labels
- [x] Hub Resume-gate steps included
- [x] Prompt decline and idle-unload cold-start steps included

### 152.12 — Delivery gate

Full verification for the epic.

#### Acceptance criteria

- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [x] `act` workflows `pr-checks.yml` and `deadcode.yml` succeed
- [x] All 152.x criteria checked; epic moved to `board/done/`

### 152.13 — Post–local-LLM local image provider prompt

After Local LLM setup completes (first-run intro / Settings local happy path from **020.25**), prompt: set up local image generation now?

- **Accept** → enter local image catalog download + runtime acquire rails (Enable ON when ready).
- **Decline** → image provider Enable **OFF**; no download required; user can opt in later from Settings → Image generation.
- Do not re-nag every launch after an explicit decline (persist a “declined / asked” flag; Settings remains the re-entry point). Dev builds may force-show if that matches **020.25** always-first-time policy — document the chosen parity.

#### Acceptance criteria

- [x] Prompt appears only after Local LLM setup success (unit/component or flow test)
- [x] Decline leaves image Enable OFF and does not start image download
- [x] Accept starts local image onboarding rails
- [x] Explicit decline is not re-prompted every app launch (unless documented dev exception)
- [x] Smoke runbook covers accept and decline
