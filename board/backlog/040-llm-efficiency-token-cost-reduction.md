# EPIC: LLM efficiency — token cost reduction and prompt hygiene

Audit and tighten every `provider.generate()` call in the codebase. Agents were written for correctness first; several paths now carry unnecessary token spend that **compounds on every player turn**. This epic addresses the highest-leverage issues from a systematic audit cross-referenced against the **current** orchestration (post-**029** turn routing, **034** yield, **035**/**036** reward passes).

## Audit cross-reference (what changed since the first draft)

The original 040 draft assumed `interpretIntent` → `narrate` on every turn. **That is no longer accurate.** After epic **029**, a typical non-combat turn is:

1. `interpretIntent` — LLM (`dm.ts`)
2. engine check/rest/travel resolution (deterministic)
3. `reviewTurn` — LLM (`turnReview.ts`) with full `NarrationContext`
4. conditional beats: `narrate`, per-NPC `generateNpcReaction`, per-party-member `decidePartyMemberAction`
5. **`decideInactivePlayerAction` for every inactive living player in the region** — always when `sceneContext` is non-empty (`turnIpc.ts`)

Combat turns skip routing but can still fire **up to `MAX_COMBAT_CATCHUP_TURNS` (10)** NPC/party LLM calls per player action, plus yield review, defeat disposition, and encounter XP/loot on end.

`assembleNarrationContext` is already built once and passed into both routing and narration — the old “re-query context for turn review” item is **partially solved**. The remaining waste is **duplicate LLM round-trips** and **fat prompts**, not duplicate DB reads.

**Estimated impact tiering** (if items 040.2–040.6 land): ~40–60% session cost reduction without changing game feel.

Builds on **006** (DM agents), **007** (campaign generation), **029** (turn routing), **034** (yield), **035**/**036** (loot/XP).

Broken down into sub-tickets **040.1–040.12**. This epic is done when all are complete, `npm run typecheck`, `npm test`, and `npm run build` pass, and **040.12** confirms call-count and prompt-size regressions are guarded.

## Definition of done

- every `provider.generate()` call has an explicit `maxTokens` ceiling documented with rationale
- non-combat hot path drops from **intent + review** (2 calls minimum) to **1 call** via merge or heuristic fast path on simple turns
- narration/routing/NPC prompts send slim context (no full event payloads, windowed facts/memories)
- inactive-player proxy and combat catch-up do not fire LLM on every turn by default
- XP/loot use engine-authoritative amounts with template narration unless enrichment is enabled
- yield/defeat disposition use rules-first paths before LLM
- shared JSON schema + emphasis guidance live in `systemPrompt`, not repeated per call
- guided identity interview windowing prevents transcript O(n²) growth
- campaign NPC shortfall fill is parallelised
- smoke/regression test documents per-turn LLM call budget

040.1 maxTokens on all agents · 040.2 merge interpretIntent + reviewTurn · 040.3 heuristic routing fast path · 040.4 slim scene context serializers · 040.5 cap sceneContext + gate inactive-player proxy · 040.6 combat catch-up flavor without per-combatant LLM · 040.7 XP/loot template defaults · 040.8 rules-first yield + defeat disposition · 040.9 shared systemPrompt for schemas · 040.10 guided identity transcript windowing · 040.11 parallelise NPC shortfall fill · 040.12 efficiency smoke + call-count regression

## Sub-tickets

### 040.1 `maxTokens` caps on all agents

#### Description

`claude.ts` defaults to **1024** output tokens when `maxTokens` is omitted. Only campaign generation sets per-call limits today. Add explicit ceilings to **every** `provider.generate()` call site (~20 agent files), tuned to expected JSON payload size.

Suggested bands (adjust in implementation with comments):

| Agent / call | Suggested cap | Rationale |
|--------------|---------------|-----------|
| `interpretIntent` / merged intent+routing | 256–384 | Structured JSON only |
| `narrate` | 768–1024 | Prose + optional side-effect fields |
| `reviewTurn` (if kept standalone during 040.2 migration) | 384 | Routing plan JSON |
| `generateNpcReaction` | 256–384 | Dialogue or action line |
| `partyMember` / `inactivePlayer` | 256 | Single action string |
| `resolveXpAward` / `resolveLoot` | 256 | narration + number |
| `proposeYieldOutcome` / `proposeDefeatDisposition` | 192 | outcome + short hint |
| `guidedIdentity` kickoff / turn | 512–768 | dmReply prose |
| `obituary` | 1024 | Long-form output |
| campaign generation | keep existing 4096–10240 | One-time cost |

Wire through `GenerateContext.maxTokens` at each call site; do not change provider defaults globally without per-call overrides in place.

#### Acceptance Criteria

- [ ] Grep for `provider.generate(` shows `maxTokens` passed (directly or via helper) at every production call site except documented exceptions
- [ ] Unit test or snapshot asserts key agents pass expected `maxTokens` to mock provider
- [ ] No agent regression: schema retry paths still succeed on valid model output
- [ ] Comment or small table in `src/agents/providers/types.ts` (or adjacent README) documents band rationale

---

### 040.2 Merge `interpretIntent` + `reviewTurn` into one agent call

#### Description

Replace the sequential **intent LLM** then **routing LLM** pattern with a single structured response, e.g.:

```json
{
  "intent": { "checkNeeded": false, "combatIntent": "none", ... },
  "routingPlan": { "disposition": "converse", "beats": [...] }
}
```

Implementation sketch:

- Add `interpretIntentAndRoute()` (or extend `interpretIntent`) in `dm.ts` / new module
- Prompt combines `buildIntentPrompt` + `buildTurnReviewPrompt` fields **once**; dedupe shared instructions
- `turnIpc.resolveRoutedTurn` calls the merged function after combat context is known; mechanical resolution (d20, rest, travel) still runs on parsed `intent` **before** beat execution
- Preserve `validateCombatIntent`, `clampIntentDC`, routing `sanitizeRoutingPlan`, and `MAX_SCHEMA_ATTEMPTS` retry semantics
- Keep a feature flag or internal switch during migration so 040.3 can layer on top

**Do not** merge `narrate` into this call — narration runs only when routing includes `dmNarration` and needs post-check outcomes.

Depends on understanding **029** routing spec (`src/shared/turnRouting/SPEC.md`).

#### Acceptance Criteria

- [ ] Non-combat routed turn uses **one** LLM call for intent + routing plan under default path
- [ ] Combat intent validation and engine check resolution behave identically to pre-merge (existing `dm.test.ts`, `turnIpc` tests updated)
- [ ] Invalid combined schema retries up to `MAX_SCHEMA_ATTEMPTS`; throws `DmSchemaError` on exhaustion
- [ ] `reviewTurn` export retained as thin wrapper or deprecated with redirect for tests — no duplicate production call path

---

### 040.3 Heuristic turn-routing fast path

#### Description

Skip the routing LLM entirely for **obvious** turns where disposition is mechanically implied. Run **after** merged intent parse (040.2) or standalone `interpretIntent` if 040.2 not yet merged.

| Condition | Deterministic `TurnRoutingPlan` |
|-----------|--------------------------------|
| `checkNeeded: true` | `composite`: optional `playerActionExpression` (rule: input looks physical) + `dmNarration` |
| `actionType` in `restShort` / `restLong` / `travel` / `modifyItem` | already bypass routing — no change |
| `combatIntent` ≠ `none` | combat path — no routing |
| Single NPC present + no check + dialogue cues (question mark, NPC name match, “ask/tell/say”) | `converse`: `npcResponse` only |
| Pure physical verb phrase, no check, no NPC address | `act`: `playerActionExpression` only |

Heuristic module: `src/agents/turnRoutingHeuristic.ts` (pure functions, fully unit-tested). LLM routing remains fallback when heuristic returns `null`.

Document precedence in `src/shared/turnRouting/SPEC.md`.

#### Acceptance Criteria

- [ ] Pure unit tests cover each heuristic row + `null` fallback cases
- [ ] `resolveRoutedTurn` uses heuristic plan when non-null; otherwise merged/split LLM routing
- [ ] No regression on composite turns (action + check + NPC) — those must fall through to LLM
- [ ] Telemetry or debug log (dev-only) records `heuristic` vs `llm` routing source for smoke validation

---

### 040.4 Slim scene context serializers

#### Description

Introduce shared slim serializers used by `assembleNarrationContext`, `buildTurnReviewPrompt`, `buildNarrationPrompt`, and NPC/party/inactive agents. Stop sending full DB rows when a summary suffices.

| Field | Today | Slim shape |
|-------|-------|------------|
| `recentEvents` | full `Event` JSON (id, timestamp, type, entire payload) | `{ type, narrationText?: string, summary?: string }` — derive summary from known payload keys |
| `logBookEntries` | full `LogEntry` | `{ category, title, content, relatedEntityId? }` — omit internal ids/dates if not needed for grounding |
| NPC `worldFacts` | all region facts, unbounded | `takeRecent` (e.g. 10) + content string only |
| NPC `memories` | full memory rows | `{ content }` or content + timestamp |
| party `relationshipEvents` | full events | same slim event shape as above |

Live in `src/agents/contextSlim.ts` (or similar). `assembleNarrationContext` returns slim types; update `NarrationContext` interface.

#### Acceptance Criteria

- [ ] `assembleNarrationContext` uses slim serializers; prompts no longer include event `id` / `campaignId` / raw payload blobs
- [ ] Unit tests: serializer output size bounded; wolf-bandit-logbook regression fixtures unchanged in **meaning** for narration tests
- [ ] NPC context assembly windows world facts (max N) and slim memories
- [ ] Party member context uses slim events

---

### 040.5 Cap within-turn `sceneContext` + gate inactive-player proxy

#### Description

Two related hot-path leaks in `turnIpc.ts`:

**A. `sceneContext` growth** — Each beat appends narration, player action, and inactive-player text. Later NPC/party/inactive calls receive the **entire** chain. Cap to last **2 beats** or **~1500 characters** (config constant) when building downstream agent prompts.

**B. Inactive-player LLM** — `executeInactivePlayerEncounter` runs after **every** routed turn with non-empty scene context, calling `decideInactivePlayerAction` per inactive living player in the region with a massive prompt (`inactivePlayer.ts`: narration log, journal, log book, story thread, 20 campaign events).

Gate inactive-player proxy unless:

- another living player character is in the region **and**
- at least one of: routing plan referenced inactive players, `crossCharacterLogBookEntries` in narration result, player input mentions inactive character name, or explicit `inactivePlayerEncounter` beat added to routing spec (optional future)

When gated off, return empty `inactivePlayerActions` without LLM.

#### Acceptance Criteria

- [ ] `sceneContext` passed to NPC/party/inactive agents is capped; unit test asserts cap applied
- [ ] Inactive-player LLM skipped on simple converse-only turns with no cross-character signal
- [ ] Inactive-player LLM still fires when cross-character log writes or shared-scene cues present (integration test)
- [ ] No change to event append semantics or `TurnResult` shape

---

### 040.6 Combat catch-up flavor without per-combatant LLM

#### Description

`resolveNonPlayerCatchUp` (`combatResolvers.ts`) calls `generateNpcReaction` **once per NPC combat turn** with scene text `'Combat turn'`. Hit/miss/damage are engine-resolved immediately after — the LLM only supplies flavor.

Replace default combat flavor with deterministic templates keyed by:

- `temperament`, `disposition`, hit/miss, crit (optional)
- speaking vs non-speaking (`reactionKind` / `**` action markers per **028**)

Reserve `generateNpcReaction` LLM for:

- speaking NPCs on crit or yield-adjacent moments (config flag), **or**
- one batched “round flavor” call per catch-up sequence (stretch goal — document if deferred)

Party member combat turns (`resolvePartyCombatTurn`) can use short templates similarly.

#### Acceptance Criteria

- [ ] Default combat catch-up produces zero `provider.generate` calls for NPC/party flavor
- [ ] Template output uses correct `reactionKind` and emphasis conventions
- [ ] Existing combat tests updated; player attack/yield/damage semantics unchanged
- [ ] Optional `COMBAT_LLM_FLAVOR=true` env or setting restores LLM flavor for manual QA (document in runbook)

---

### 040.7 XP and loot template defaults

#### Description

`resolveXpAward` and loot agent already have engine fallbacks (`budget.suggested`, policy clamps). Make **template narration the default path**:

- XP amount: always `budget.suggested` (or clamped engine value) — no LLM required
- Loot grants: engine/catalog retrieval path selects items; template `lootNarration` from grant names

Add optional `enrichRewardNarration` setting (default **false**) that calls LLM for flavor-only rewrites of template text. When false, `runEncounterXpPass`, `runQuestXpPass`, `runEncounterLootPass`, `runQuestLootPass` skip agent calls entirely.

#### Acceptance Criteria

- [ ] Encounter end + quest complete award XP/loot with **no** LLM when enrichment disabled
- [ ] Template narration is grammatically acceptable one-liner per source type
- [ ] Setting enables prior LLM flavor behavior without code path deletion
- [ ] `encounterQuestLootSmoke.test.ts` and progression tests pass with enrichment off

---

### 040.8 Rules-first yield and defeat disposition

#### Description

`proposeYieldOutcome` and `proposeDefeatDisposition` already have deterministic fallbacks. Invert default:

**Yield** (`yieldReview.ts`): evaluate temperament + `combatTier` + lethality + `allowedOutcomes` with a pure rules function (extend `defaultYieldOutcome`). Call LLM only when rules return `ambiguous` (e.g. veteran tier + multiple allowed outcomes).

**Defeat** (`defeatDisposition.ts`): map alignment + backstory keywords + `deathMode` to disposition table before LLM. Non-speaking victors already skip LLM — keep that.

#### Acceptance Criteria

- [ ] Pure unit tests for rules tables cover cowardly surrender, beast flee, fanatic fight_on, non-lethal incapacitated, lawful imprison, etc.
- [ ] LLM call count for yield/defeat drops to near-zero in scripted combat tests
- [ ] Narration hints still produced from rules (template strings)
- [ ] LLM fallback preserved when rules return `ambiguous`

---

### 040.9 Shared `systemPrompt` for JSON schemas and emphasis guidance

#### Description

Repeated per-prompt boilerplate inflates **input** tokens on every call:

- `Respond ONLY with JSON: { ... }` blocks in `dm.ts`, `turnReview.ts`, `npc.ts`, `loot.ts`, `xp.ts`, etc.
- `NARRATIVE_EMPHASIS_GUIDANCE` / `NPC_EMPHASIS_GUIDANCE` appended to multiple prompts

Add `src/agents/sharedSystemPrompts.ts` with:

- `AGENT_JSON_CONTRACT_SYSTEM` — global rules (JSON only, no markdown fences, untrusted player text)
- per-agent schema fragments registered once

Pass via `provider.generate(prompt, { systemPrompt, maxTokens })`. User message retains turn-specific context only.

#### Acceptance Criteria

- [ ] DM, turn review, NPC, loot, XP agents use shared system prompt; user prompts measurably shorter (snapshot or character-count test)
- [ ] Claude and Player2 adapters both receive system message correctly (existing `player2.test.ts` pattern)
- [ ] Schema validation tests still pass

---

### 040.10 Guided identity transcript windowing

#### Description

`buildIdentityInterviewPrompt` sends the **full** `transcript` every turn — O(n²) token growth over a long interview.

Window to last **4–5** exchanges. Always include `currentFoundations` summaries (locked-in `who`/`why`/`where`/`what` summaries) even when their turns aged out of the window.

#### Acceptance Criteria

- [ ] Prompt includes at most 5 transcript turns plus all completed foundation summaries
- [ ] Unit test: 10-turn fixture produces same-sized transcript section regardless of turns 1–5 content
- [ ] `guidedCreationSmoke.test.ts` still passes

---

### 040.11 Parallelise campaign NPC shortfall fill

#### Description

`fillCampaignNpcShortfall` (`campaignGeneration/index.ts`) loops regions and calls `generateSingleNpc` **serially**. Independent shortfall calls should use `Promise.all` per region batch (respect rate limits with optional concurrency cap of 3–5).

#### Acceptance Criteria

- [ ] Shortfall fill issues parallel requests; test mocks confirm concurrent calls
- [ ] Generation result identical to serial ordering (same NPC count per region)
- [ ] Failed single NPC does not fail entire batch — same partial behavior as today

---

### 040.12 Efficiency smoke test + call-count regression

#### Description

Add `src/agents/llmEfficiency.smoke.test.ts` (or extend existing smoke harness) using `createMockProvider` to assert **LLM call counts** per scenario:

| Scenario | Max calls (after epic) |
|----------|------------------------|
| Simple dialogue, 1 NPC, no check | 1 (merged intent+routing) or 0 with heuristic |
| Check + narration | 2 (merged routing + narrate) or 1 with heuristic + narrate |
| Combat player attack, 2 NPC catch-up | 1 intent + 0 flavor (040.6) + optional yield |
| Encounter end rewards, enrichment off | 0 XP/loot LLM |

Also snapshot **prompt character counts** for `assembleNarrationContext` before/after 040.4 (fixture campaign).

Update or add `docs/runbooks/llm-efficiency-smoke-test.md` with manual verification steps and optional dev metrics (`provider.calls.length`).

Depends on **040.1–040.7** at minimum; run full suite after all tickets.

#### Acceptance Criteria

- [ ] Automated smoke tests assert call-count ceilings per scenario
- [ ] Prompt size regression fixture documents slim context savings
- [ ] Runbook lists scenarios and expected call budget
- [ ] `npm test`, `npm run lint`, `npm run build` pass with epic complete
