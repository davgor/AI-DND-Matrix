# Turn review and gameplay loop routing

When the player submits an action, the DM turn-review step triages the submission before the app decides what to show. Mechanical resolution (intent parsing, checks, rest, travel, dying) runs first; routing only decides presentation and which agents fire.

## One merged intent + routing call (epic 040.2)

Intent interpretation and turn routing arrive from a **single** LLM call — `interpretIntentAndRoute` (`src/agents/intentAndRoute.ts`), invoked from `resolvePlayerTurn`. The response carries both halves:

```json
{
  "intent": { "checkNeeded": false, "combatIntent": "none", "...": "..." },
  "routingPlan": { "disposition": "converse", "beats": [{ "kind": "npcResponse", "npcIds": ["..."] }] }
}
```

- The `intent` half keeps the exact schema, DC clamping, and combat-intent validation of the standalone `interpretIntent`; invalid responses retry up to `MAX_SCHEMA_ATTEMPTS` and then throw `DmSchemaError`.
- The `routingPlan` half is sanitized against present NPC ids (`sanitizeRoutingPlan`) exactly as the old standalone review call was.
- Rest/travel/modifyItem and non-`none` combat intents bypass beat execution entirely, so the model may omit `routingPlan` on those turns; when present it is simply unused.
- `reviewTurn` (`src/agents/turnReview.ts`) remains only as a deprecated redirect onto the merged call for test migration — there is no separate routing LLM call in production.

**Routing happens before the d20 is rolled.** The old two-call flow fed the resolved check outcome into the routing prompt; the merged call cannot. Instead, when the response has `checkNeeded: true`, `ensureDmNarrationBeat` deterministically guarantees a `dmNarration` beat in the plan post-parse (inserted before the first `npcResponse` beat, else appended), so engine check outcomes always reach narration and its side-effect writes.

Routing-source precedence (updated by epic 040.3 when the heuristic fast path lands):

1. Merged LLM call (`interpretIntentAndRoute`) — current default for all routed turns.
2. _(Reserved for 040.3)_ deterministic heuristic plans for provably simple turns, with the merged call as fallback.

## Three routing outcomes

Each beat in a turn maps to one of three narrative outcomes (party-member beats are a fourth orchestration hook):

### NPC response

Invoke the NPC/creature agent for targeted character(s) when the player converses with or provokes someone present in the scene.

- Speaking NPCs return italic dialogue.
- Non-speaking creatures return bold action lines (epic 028 `reactionKind: 'action'`).

**Example:** Player asks the blacksmith about a broken blade → `npcResponse` beat targeting the blacksmith; no DM narration beat.

### DM narration

The DM describes consequences, environment, and check outcomes when the moment calls for scene-setting or authoritative resolution copy. Engine resolution is passed into narration unchanged; agents never invent check results.

**Example:** Player attempts to pick a lock → agility check resolves in the engine → `dmNarration` beat narrates success or failure.

### Player action expression

Render what the player character is physically doing as third-person prose in **bold**, instead of echoing raw player chat.

**Example:** Player types "I draw my sword" → `playerActionExpression` beat with `actionDescription: "Kael draws his sword."`; raw `playerInput` is stored for audit only.

## Mechanical resolution stays authoritative

- Checks, damage, rest, travel, and dying sequences are resolved by the engine before or regardless of narrative routing.
- Rest, travel, and dying short-circuit the routing dispatcher entirely.
- Routing plans never override `success`, `total`, `dc`, HP, or in-game date.

## Composite turns and beat ordering

A single turn may combine multiple beats. The routing plan's `beats` array is executed in order.

**Example — draw sword, fail agility check, goblin reacts:**

1. `playerActionExpression` — "Kael draws his sword."
2. `dmNarration` — narrates the failed dodge.
3. `npcResponse` — goblin snarls and attacks.

Precedence: express visible player action before narrating its consequence; narrate check outcomes before NPC reactions that depend on them; party-member beats run only when the plan includes them (not on converse-only dialogue turns).

## Visual contract (epic 028)

Player action expression and non-speaking creature actions share the bold prose convention via `wrapActionDescription` / `stripActionMarkers`.
