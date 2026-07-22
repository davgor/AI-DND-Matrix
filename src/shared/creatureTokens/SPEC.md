# Enemy creature tokens (epic 123)

Species-stable combat-creature portraits for Social avatars and the enemy dossier portrait slot.

## Defaults (locked)

| Setting | Default | Notes |
|---------|---------|--------|
| Campaign `generativeTokensEnabled` ("Use generative tokens?") | **OFF** | No enqueue when false; unified with NPC/companion tokens (epic **144**) |
| Local image provider (llamacpp paint path) | **OFF** | v1 uses mock/cloud per m001.1; tests must not require llamacpp |

See `types.ts` for `shouldEnqueueCreatureToken` and entity kind `enemy_creature`. Legacy `enemyTokenGenerationEnabled` mirrors the unified flag.

## Appearance fields (locked)

| Field | Type | Purpose |
|-------|------|---------|
| `silhouette` | `string \| null` | Overall body shape (e.g. quadruped wolf-like) |
| `sizeClass` | `string \| null` | Relative size (e.g. medium, large, huge) |
| `primaryColors` | `string[]` | Dominant colors; empty when unknown |
| `distinguishingMarks` | `string \| null` | Unique visual marks |
| `textureOrMaterial` | `string \| null` | Surface (fur, chitin, stone, …) |

## Generation contract (123.3)

- Shared image API: `src/shared/imageGeneration/` (`ImageProvider`, typed success/failure).
- Creature-token prompt: `buildCreatureTokenPrompt` — token-suitable creature portrait; not environment scene; not battle-map token.
- Orchestration: `generateCreatureToken(provider, request)` — no UI coupling.
- Tests use `createMockImageProvider` (success + failure); no llamacpp required.
- Production v1 default scheduler provider is a **placeholder PNG mock** (not llamacpp); swap for cloud later per m001.1.
