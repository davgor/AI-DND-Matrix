# 146 — Fix local llama.cpp catalog download HTTP 404

Settings → Local → Download model fails with `Download failed with HTTP 404` for the pinned Qwen2.5 7B Instruct (Q4_K_M) entry. The catalog still points at `Qwen/Qwen2.5-7B-Instruct-GGUF/.../qwen2.5-7b-instruct-q4_k_m.gguf`, which Hugging Face no longer hosts as a single file (Q4_K_M was split into multi-part shards). Point the curated catalog at a reachable single-file Q4_K_M GGUF (~4.7 GB) so in-app download works again.

## Acceptance criteria

- [x] Catalog `downloadUrl` for `qwen25-7b-instruct-q4-k-m` resolves to an existing single-file GGUF (HTTP 2xx/302 with linked size), not the removed official single-file path
- [x] Unit test asserts the pinned entry URL targets a known-good single-file host/path (bartowski Q4_K_M or equivalent)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI (`pr-checks.yml` + `deadcode.yml`) pass
