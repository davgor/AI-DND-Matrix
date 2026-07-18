# 077 — Enter the world: wire refreshDetail into play handoff

Clicking **Enter the world** (and auto-enter after opening-scene completion) calls `readyToEnterPlay` IPC successfully, then throws on `await refreshDetail()` because `useReadyAppBody` never passes `refreshDetail` into `usePlayEntryState`. The rejection is swallowed (`void …()`), so the UI stays on guided opening scene with phase complete and the button appears broken. Follow-up to 076, which wired IPC/preload but missed this composition.

## Acceptance criteria

- [x] `useReadyAppBody` passes a working `refreshDetail` into `usePlayEntryState` / ready-to-enter-play factory
- [x] Successful enter-play handoff calls refresh then navigates to play (`setStage('main')` + active character)
- [x] IPC or refresh failures surface `enterPlayBlockerMessage` instead of failing silently
- [x] Unit tests cover ready-to-enter-play handler success path (refresh + onEnterPlay) and failure messaging
- [x] `npm test`, `npm run lint`, and `npm run build` pass
