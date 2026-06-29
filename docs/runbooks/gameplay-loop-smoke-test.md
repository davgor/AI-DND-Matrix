# Gameplay loop routing smoke test

## Automated

```bash
npm test -- src/db/gameplayLoopSmoke.test.ts src/agents/turnReview.test.ts src/shared/turnRouting/types.test.ts src/main/turnIpc.test.ts src/main/narrationLog.test.ts
```

Run in isolation:

```bash
npx vitest run src/db/gameplayLoopSmoke.test.ts
```

## What it covers

Three turns in one campaign using mock provider fixtures:

1. **Converse-only** — player addresses an NPC; routing plan returns `npcResponse` without `dmNarration`; NPC dialogue appears in the exposition feed.
2. **Player action expression** — routing plan returns `playerActionExpression`; bold third-person prose is stored and mapped (raw `playerInput` is audit-only).
3. **Narrated check** — engine resolves a check; routing plan includes `dmNarration`; narration and check fields surface on `TurnResult`.

Also asserts rest, travel, and dying short-circuits still bypass the routing dispatcher.

## Manual (dev)

1. Enter play and ask an NPC a question — expect italic dialogue without a redundant scene paragraph first.
2. Perform a visible physical action — expect bold third-person prose in the DM exposition feed, not your raw chat line.
3. Attempt a skill check — expect DM narration of the engine outcome and optional roll details when toggled on.
