# 151 — CI check for external download links

Pinned llama.cpp CPU/GPU runtime zips and curated GGUF catalog URLs can 404 or start serving HTML/error pages without any in-repo test noticing (see 146). Add a CI job that resolves those URLs from source of truth, confirms HTTP success, and proves a real binary download works (range probe + magic bytes + minimum size) — on every PR and on a daily schedule so link rot is caught quickly.

## Acceptance criteria

- [x] Script collects Windows CPU + Vulkan runtime zip URLs from `runtimeAcquire.ts` and catalog `downloadUrl`s from `llamaCppCatalog.ts`
- [x] Probe fails on non-2xx/206, HTML/error bodies, wrong magic bytes (zip/`GGUF`), or declared size below a safe minimum
- [x] Unit tests cover URL collection + probe success/failure with injected fetch (no live network in `npm test`)
- [x] GitHub Actions workflow runs the live check on `pull_request` to `main` and on a daily `schedule` (plus `workflow_dispatch`)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI (`pr-checks.yml` + `deadcode.yml`) pass
