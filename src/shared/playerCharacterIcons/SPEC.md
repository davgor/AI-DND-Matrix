# Player character icons (epic 144)

Prompt-driven head/shoulders portraits for player characters (`characters.kind = 'player'`).

## Defaults (locked)

| Setting | Default | Notes |
|---------|---------|--------|
| Campaign generative-tokens flag | **N/A** | Player Generate/Regenerate is always available (user-initiated); not gated by `generativeTokensEnabled` |
| Local image provider (llamacpp paint path) | **OFF** | v1 uses mock/cloud; tests must not require llamacpp |

Entity kind: `player_character` (`PLAYER_CHARACTER_ICON_ENTITY_KIND`).

## Generation contract (144.2)

- Shared image API: `src/shared/imageGeneration/` (`ImageProvider`, typed success/failure).
- Request: `PlayerCharacterIconGenerateRequest` — identity + free-text `appearancePrompt`.
- Prompt: `buildPlayerCharacterIconPrompt` — head-and-shoulders only; includes user appearance text.
- Orchestration: `generatePlayerCharacterIcon(provider, request)` — no UI coupling.
- Tests use `createMockImageProvider` (success + failure); no llamacpp required.
