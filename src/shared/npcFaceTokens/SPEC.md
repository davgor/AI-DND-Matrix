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

## AI companion face tokens (epic 139)

Companions reuse this pipeline — they do **not** fork a second image stack.

| Concern | Rule |
|---------|------|
| Entity kind | `ai_party_member` (`COMPANION_FACE_TOKEN_ENTITY_KIND` in `src/shared/partyMembers/`) |
| Toggle | Same campaign flag: `npcFaceTokenGenerationEnabled` |
| Enqueue | On companion Accept when toggle ON — `maybeEnqueueCompanionFaceTokenAfterAccept` in `src/main/companionFaceTokenScheduler.ts` |
| Persist | File under `companion-face-tokens/`; path stored on character `portrait_path` |
| Orchestration | Calls shared `generateNpcFaceToken` with companion identity/appearance |
| Blocking | Never — Accept → identity / play continues if the provider fails |
| Surfaces | Social party lines + play roster avatar; letter-initial fallback |
| Out of scope here | Companion dossiers, full-body combat tokens |

Contract helpers for enqueue policy: `shouldEnqueueCompanionFaceToken` in `partyMembers/types.ts`.
