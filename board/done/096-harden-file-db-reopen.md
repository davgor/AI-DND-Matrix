# 096 — Harden file-DB reopen smoke against Windows hang

`itemSystemSmoke` / `logBookSmoke` persistence tests still flake with vitest `testTimeout` (15s) on Windows when `reopenFileTestDb` calls `new Database(samePath)` after close. Retry-on-throw does not help if the open **blocks** instead of throwing.

Reopen must prove durable on-disk bytes without re-locking the original path (read file → open Buffer, or open a copy).

## Acceptance criteria

- [x] `reopenFileTestDb` does not open the original path again after close (uses on-disk bytes / copy)
- [x] Helper unit test covers reopen duration bound + readable persisted state
- [x] `itemSystemSmoke` / `logBookSmoke` persistence tests still pass
- [x] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
