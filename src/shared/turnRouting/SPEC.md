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

Routing-source precedence:

1. Merged LLM call (`interpretIntentAndRoute`) — default for every routed turn the heuristic cannot prove simple.
2. Deterministic heuristic plans (epic 040.3, `src/agents/turnRoutingHeuristic.ts`) — evaluated **before** the merged call from raw player input + turn context. When a heuristic row fires, the turn skips the routing half entirely: the merged call is downgraded to the smaller intent-only prompt (`interpretIntent` in `dm.ts` — no routing schema, no scene grounding payloads) and the routing plan is deterministic. Whenever the heuristic returns `null`, the merged call remains the routing source. A dev-only debug log records `heuristic` vs `llm` per turn.

## Heuristic fast path (epic 040.3)

The heuristic (`src/agents/turnRoutingHeuristic.ts`, pure functions over caller-assembled signals) fires only for provably simple turns:

| Condition | Deterministic plan |
|-----------|--------------------|
| `checkNeeded: true` (only when the converse/act conditions below already held pre-LLM) | `composite`: optional `playerActionExpression` (if input matched a physical verb) + `dmNarration`; for a dialogue-cued check turn, `dmNarration` + `npcResponse` |
| `actionType` rest/travel/modifyItem | already bypass routing — no change |
| `combatIntent` ≠ `none`, or an encounter is active | combat path — no routing, heuristic never fires |
| Single NPC present + no check + dialogue cue (question mark, NPC name match, ask/tell/say) + prior interaction | `converse`: `npcResponse` only |
| Pure physical verb phrase (whitelisted gesture verbs), no check, no NPC address | `act`: `playerActionExpression` only |

**Side-effect starvation guard.** `dmNarration` is the sole write path for world facts, quests (and their XP/loot rewards), log book, cross-character log entries, journal, item grants, commerce, spells, alignment, and story-driven death. The converse-only and act-only rows omit it, so they return `null` (defer to LLM routing) whenever any signal suggests state could change:

- an active quest whose title/summary/objective text mentions a present NPC name or region keyword,
- a pending alignment shift,
- first interaction with the present NPC this session (no NPC memories yet),
- any present NPC is hostile (combat or consequence narration may follow on any turn),
- player input containing transactional verbs (buy/sell/give/take/learn/purchase/trade/steal/hand/pay/teach/join/…),
- the player has AI party members (heuristic plans omit `partyMember` beats),
- inactive living player characters share the region (cross-character log writes flow through `dmNarration`).

The heuristic is deliberately biased toward `null`: check turns that were not already provable pre-LLM keep the (richer) merged-call plan, which `ensureDmNarrationBeat` already guarantees carries narration. Composite turns (action + check + NPC) always fall through to LLM routing.

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
