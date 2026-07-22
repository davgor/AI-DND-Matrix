# 142 — Oxlint max-lines-per-function splits

Split long functions/describe callbacks that fail oxlint `max-lines-per-function` (≤50 lines) without changing behavior.

## Acceptance criteria

- [x] Listed test/source files each pass `npx oxlint` for max-lines-per-function
- [x] No lint rules disabled; no intentional behavior changes
