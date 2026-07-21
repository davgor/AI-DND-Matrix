# NPC face tokens (epic 122)

Speaking-NPC head/shoulders portraits for Social avatars and the dossier portrait slot.

## Defaults (locked)

| Setting | Default | Notes |
|---------|---------|--------|
| Campaign `npcFaceTokenGenerationEnabled` | **OFF** | No enqueue when false |
| Local image provider (llamacpp paint path) | **OFF** | v1 uses mock/cloud per m001.1; tests must not require llamacpp |

See `types.ts` for `shouldEnqueueNpcFaceToken` and entity kind `speaking_npc`.

## Generation contract (122.3)

- Shared image API: `src/shared/imageGeneration/` (`ImageProvider`, typed success/failure, error categories).
- Face-token prompt: `buildNpcFaceTokenPrompt` — head-and-shoulders only, not full-body.
- Orchestration: `generateNpcFaceToken(provider, request)` — no UI coupling.
- Tests use `createMockImageProvider` (success + failure); no llamacpp required.
- Production v1 default scheduler provider is a **placeholder PNG mock** (not llamacpp); swap for cloud later per m001.1.
