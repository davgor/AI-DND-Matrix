# 150 — Verbose llama.cpp Check runtime LLM ping

## Description

Settings → Local llama.cpp “Check runtime” only validates attach `/health` or managed paths on disk. That is not enough to debug startup/load failures. Extend Check runtime to also ping the local OpenAI-compatible chat completions endpoint and return verbose, multi-line diagnostics (mode, base URL, paths, health status, HTTP status, response body snippet, error class/message).

## Acceptance criteria

- [x] Check runtime performs an LLM ping (`POST /v1/chat/completions` with a tiny max_tokens) after existing path/health checks
- [x] Success reports that health and ping both succeeded (truncation on a 1-token ping still counts as success)
- [x] Failure messages are verbose and include debugging fields (mode, baseUrl, health, paths when relevant, HTTP status, response body snippet, error detail)
- [x] Unit tests cover ping success, health-only failure, and chat ping failure with body details
- [x] Settings UI can display multi-line check output without collapsing it
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
