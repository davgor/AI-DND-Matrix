# 149 — Fix llama.cpp runtime acquire (install full package + fail-fast start)

## Description

After “Acquire runtime” + Save, Settings appears to hang then shows `Local narrative engine failed to become ready before timeout.` The acquired `llama-server.exe` is only ~9 KB and exits with `STATUS_DLL_NOT_FOUND` because acquire renames only the `.exe` out of the zip and deletes `_staging` (where the required sibling DLLs lived).

Install the full extracted runtime payload next to `llama-server.exe`, validate DLLs on Windows, and fail managed lifecycle immediately if the child exits before `/health` is ready (so Save does not wait the full 60s timeout).

## Acceptance criteria

- [x] Runtime acquire copies the binary’s directory contents (exe + DLLs/shared libs) into `userData/llamacpp/runtime`, not only the exe
- [x] Windows install fails with a typed recovery error if no DLLs are present beside `llama-server.exe`
- [x] Managed lifecycle detects child exit during startup and fails immediately with an actionable error (not a full readiness timeout)
- [x] Unit tests cover full-payload install + early child-exit during start
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
