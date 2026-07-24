# 148 — Stream llama.cpp model download + progress bar

## Description

Catalog GGUF downloads (~4.7 GB) currently call `response.arrayBuffer()` in the main process, which OOMs with `Array buffer allocation failed` and never emits mid-transfer progress. Settings also never subscribes to `llamacpp:downloadProgress`, so the UI only shows “Downloading…” / “Failed”.

Stream the HTTP body to the `.partial` file on disk with incremental progress IPC, and show a download progress bar (plus percent / bytes text) in Local llama.cpp Settings.

## Acceptance criteria

- [x] Model download streams to disk (no full-body `arrayBuffer()` / in-memory buffer of the GGUF)
- [x] Progress events fire incrementally during transfer (`bytesReceived` / `percent` update before complete)
- [x] Settings UI shows a progress bar and progress text while downloading
- [x] Cancel still aborts and does not leave a ready model path
- [x] Checksum verification still works when a SHA-256 is configured (hash while streaming or from file)
- [x] Unit tests cover streaming progress callbacks and existing success / cancel / checksum cases
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
