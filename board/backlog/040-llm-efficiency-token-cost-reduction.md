# EPIC: LLM efficiency — token cost reduction and prompt hygiene

Audit and tighten every `provider.generate()` call in the codebase. Agents were written for correctness first; several paths now carry unnecessary token spend that **compounds on every player turn**. This epic addresses the highest-leverage issues from a systematic audit cross-referenced against the **current** orchestration (post-**029** turn routing, **034** yield, **035**/**036** reward passes, and now also post-**049–052** race/background/NPC-identity generation).

## Audit cross-reference (refreshed against current code — nothing in this epic has landed yet)

**Second refresh.** The original audit (below) is still accurate on every point it made — none of 040.1–040.12 have been implemented. What's new in this pass is (a) precise current file:line confirmation for every claim, since several file names have drifted (`turnReview.ts`, `combatResolvers.ts`, `progressionPipeline.ts`/`lootPipeline.ts` are the real names today, not the ones the first draft guessed), and (b) a **new, previously-unaccounted-for cost driver**: epics **049–052** (race selection, character backgrounds, NPC background integration, NPC core identity bundle) all landed since the first draft and materially changed the token/call-count picture — see the new **040.13** below.

A typical non-combat turn is still:

1. `interpretIntent` — LLM (`dm.ts`)
2. engine check/rest/travel resolution (deterministic)
3. `reviewTurn` — LLM (`turnReview.ts`), called from `resolveRoutedTurn` in `turnIpc.ts`, building its own prompt from `assembleNarrationContext`
4. conditional beats: `narrate`, per-NPC `generateNpcReaction`, per-party-member `decidePartyMemberAction`
5. **`executeInactivePlayerEncounter` for every inactive living player in the region** — fires whenever `sceneContext` is non-empty (`turnIpc.ts`), which in practice means "whenever any prior beat produced any text"

Combat turns skip routing but can still fire **up to `MAX_COMBAT_CATCHUP_TURNS` (10)** NPC/party LLM calls per player action (`combatResolvers.ts`'s `resolveNonPlayerCatchUp`), plus yield review, defeat disposition, and encounter XP/loot on end — every one of those is still LLM-first with a deterministic fallback used only after schema-parse exhaustion, not as a default fast path.

**New since the first draft**: creating a single new speaking NPC through Campaign Review's "Generate NPC" (the flagged/single-NPC path, `generateNpcForCampaign` → `generateFlaggedNpc` in `src/agents/campaignGeneration/flaggedNpc.ts`) now costs **up to 3 sequential LLM calls** where it used to cost 1 (or 2, when a not-yet-realized race was involved): a phase-1 core-bundle call, a conditional race-lore-realize call, and a phase-2 details call. See **040.13**.

**Estimated impact tiering** (if items 040.2–040.6 and 040.13 land): ~40–60% session cost reduction on the turn/combat hot path, without changing game feel; 040.13 is a *separate, deliberate* tradeoff (richer NPC grounding) that this epic tracks and bounds rather than reverses.

Builds on **006** (DM agents), **007** (campaign generation), **029** (turn routing), **034** (yield), **035**/**036** (loot/XP), and now also **049–052** (race/background/NPC-identity generation, whose call-count impact 040.13 addresses).

Broken down into sub-tickets **040.1–040.13**. This epic is done when all are complete, `npm run typecheck`, `npm test`, and `npm run build` pass, and **040.12** confirms call-count and prompt-size regressions are guarded.

## Definition of done

- every `provider.generate()` call has an explicit `maxTokens` ceiling documented with rationale
- non-combat hot path drops from **intent + review** (2 calls minimum) to **1 call** via merge or heuristic fast path on simple turns
- narration/routing/NPC prompts send slim context (no full event/log-entry payloads, windowed facts/memories)
- inactive-player proxy and combat catch-up do not fire LLM on every turn by default
- XP/loot use engine-authoritative amounts with template narration unless enrichment is enabled
- yield/defeat disposition use rules-first paths before LLM (defeat disposition's non-speaking-victor skip already does this — extend the pattern)
- shared JSON schema + emphasis guidance live in `systemPrompt`, not repeated per call
- guided identity interview windowing prevents transcript O(n²) growth, and the now-larger static identity block (race lore + background) is not re-sent as free-form user-prompt text every turn
- campaign NPC shortfall fill is parallelised without breaking cross-NPC name-collision checks
- the flagged single-NPC generation pipeline's call count (2–3 calls) is measured, tuned, and guarded against further regression
- smoke/regression test documents per-turn LLM call budget, including the flagged-NPC scenario

040.1 maxTokens on all agents · 040.2 merge interpretIntent + reviewTurn · 040.3 heuristic routing fast path · 040.4 slim scene context serializers · 040.5 cap sceneContext + gate inactive-player proxy · 040.6 combat catch-up flavor without per-combatant LLM · 040.7 XP/loot template defaults · 040.8 rules-first yield + defeat disposition · 040.9 shared systemPrompt for schemas · 040.10 guided identity transcript windowing (+ static identity block hygiene) · 040.11 parallelise NPC shortfall fill · 040.12 efficiency smoke + call-count regression · 040.13 flagged-NPC generation call-count tracking (049–052 fallout)

## Sub-tickets

### 040.1 `maxTokens` caps on all agents

#### Description

`claude.ts` defaults to **1024** output tokens when `maxTokens` is omitted. **Confirmed by audit: 5 call sites already comply, 23 do not.**

Already compliant: `campaignGeneration/index.ts` (bulk/additional-region/single-NPC generation), `campaignGeneration/flaggedNpc.ts` (`CORE_BUNDLE_MAX_TOKENS=2048` for phase 1, `FINAL_NPC_MAX_TOKENS=4096` for phase 2 — note phase 1 only returns a tiny `{canSpeak, temperament, race?, gender?, alignment?, class?, background?}` object and is almost certainly over-budgeted at 2048; tighten to the 256–384 "structured JSON only" band below as part of this ticket), and `settingsIpc.ts`'s connectivity ping (`maxTokens:1`).

Still uncapped (defaulting to 1024, tune per the bands below): `dm.ts` (`interpretIntent`, `narrate`, homebrew flavor), `turnReview.ts` (`reviewTurn`), `npc.ts` (`generateNpcReaction`), `partyMember.ts`, `inactivePlayer.ts`, `yieldReview.ts`, `defeatDisposition.ts`, `xp.ts`, `loot.ts`, `fleeNarration.ts`, `itemModification.ts`, `levelUp.ts`, `backgroundStory.ts`, `guidedIdentity.ts` (both kickoff and turn calls), `guidedOpeningScene.ts`, `obituary.ts`, `retiredAdventurerReview.ts`, `regionHistoryCompression.ts`, `raceLore.ts` (`generateRaceLore`), `recapIpc.ts`.

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
| `guidedOpeningScene` | 512–768 | scene prose |
| `backgroundStory` | 768 | ~2 paragraphs of prose |
| `raceLore.generateRaceLore` | 512 | structured lore JSON, one-time per race per campaign |
| `flaggedNpc` core-bundle (phase 1) | 256–384 | tiny structured JSON, currently over-budgeted at 2048 |
| `flaggedNpc` details (phase 2) | keep 4096 or tune down | prose backstory — measure actual output size before cutting |
| `obituary` | 1024 | Long-form output |
| campaign generation (bulk/additional-region) | keep existing 4096–10240 | One-time cost |

Wire through `GenerateContext.maxTokens` at each call site; do not change provider defaults globally without per-call overrides in place.

#### Acceptance Criteria

- [ ] Grep for `provider.generate(` shows `maxTokens` passed (directly or via helper) at every production call site except documented exceptions
- [ ] `flaggedNpc.ts`'s `CORE_BUNDLE_MAX_TOKENS` is tuned down from 2048 to the structured-JSON band (256–384) with a comment explaining why
- [ ] Unit test or snapshot asserts key agents pass expected `maxTokens` to mock provider
- [ ] No agent regression: schema retry paths still succeed on valid model output
- [ ] Comment or small table in `src/agents/providers/types.ts` (or adjacent README) documents band rationale

---

### 040.2 Merge `interpretIntent` + `reviewTurn` into one agent call

#### Description

**Confirmed still two sequential LLM calls.** `turnIpc.ts`'s `resolvePlayerTurn` calls `interpretIntent` (`dm.ts`) first; for non-combat/rest/travel/modifyItem turns, `resolveIntentRoutedTurn` falls through to `resolveRoutedTurn`, which calls `reviewTurn` (`turnReview.ts`) — a second, independent LLM round trip with its own prompt built from `assembleNarrationContext`. No merged function exists anywhere in `dm.ts` or `turnReview.ts` today.

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

**Confirmed: does not exist yet.** No `turnRoutingHeuristic.ts` file or export anywhere in `src/agents` or `src/shared/turnRouting`; `resolveRoutedTurn` unconditionally calls `reviewTurn`.

Skip the routing LLM entirely for **obvious** turns where disposition is mechanically implied. Run **after** merged intent parse (040.2) or standalone `interpretIntent` if 040.2 not yet merged.

| Condition | Deterministic `TurnRoutingPlan` |
|-----------|--------------------------------|
| `checkNeeded: true` | `composite`: optional `playerActionExpression` (rule: input looks physical) + `dmNarration` |
| `actionType` in `restShort` / `restLong` / `travel` / `modifyItem` | already bypass routing — no change |
| `combatIntent` ≠ `none` | combat path — no routing |
| Single NPC present + no check + dialogue cues (question mark, NPC name match, "ask/tell/say") | `converse`: `npcResponse` only |
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

**Confirmed partially done, but not the part this ticket is about.** Count-windowing already exists and is out of scope to redo: `src/agents/contextWindow.ts`'s `takeRecent` (`DEFAULT_RECENCY_WINDOW=20`) caps `recentEvents`, and `src/agents/logBookWindow.ts`'s `windowLogEntriesForNarration` (`LOG_ENTRIES_PER_CATEGORY_LIMIT=5`) caps log entries per category. **What's actually missing is field-shape slimming** — every event/log-entry object that survives the count window is still the full raw DB row. `NarrationContext.recentEvents` is typed `Event[]` (the full `{ id, campaignId, timestamp, type, payload }` shape) and serialized via raw `JSON.stringify(context.recentEvents)` in both `dm.ts` and `turnReview.ts`; `logBookEntries` is the full `LogEntry` row (`id, campaignId, characterId, category, title, content, relatedEntityId, learnedInGameDate, createdAt`), also raw-stringified.

Introduce shared slim serializers used by `assembleNarrationContext`, `buildTurnReviewPrompt`, `buildNarrationPrompt`, and NPC/party/inactive agents. Stop sending full DB rows when a summary suffices — this ticket is purely about shape, not count (that's already solved).

| Field | Today | Slim shape |
|-------|-------|------------|
| `recentEvents` | full `Event` JSON (id, timestamp, type, entire payload) | `{ type, narrationText?: string, summary?: string }` — derive summary from known payload keys |
| `logBookEntries` | full `LogEntry` | `{ category, title, content, relatedEntityId? }` — omit internal ids/dates if not needed for grounding |
| NPC `worldFacts` | all region facts, unbounded | `takeRecent` (e.g. 10) + content string only |
| NPC `memories` | full memory rows | `{ content }` or content + timestamp |
| party `relationshipEvents` | full events | same slim event shape as above |

Live in `src/agents/contextSlim.ts` (new file — confirmed nothing like it exists today). `assembleNarrationContext` returns slim types; update `NarrationContext` interface.

#### Acceptance Criteria

- [ ] `assembleNarrationContext` uses slim serializers; prompts no longer include event `id` / `campaignId` / raw payload blobs
- [ ] Unit tests: serializer output size bounded; wolf-bandit-logbook regression fixtures unchanged in **meaning** for narration tests
- [ ] NPC context assembly windows world facts (max N) and slim memories
- [ ] Party member context uses slim events

---

### 040.5 Cap within-turn `sceneContext` + gate inactive-player proxy

#### Description

**Confirmed both leaks are real and unconditional.** In `turnIpc.ts`, `BeatExecutionState.sceneContext` accumulates via unconditional string concatenation across three points (narration beat, player-action-expression beat, inactive-player action appended back in) — no length/beat-count limit, no slicing, no cap constant anywhere.

`executeInactivePlayerEncounter` has exactly one guard: it returns early only if `sceneContext` is fully empty. Otherwise it runs for **every** living inactive player in the region (`listInactiveLivingPlayersInRegion`), unconditionally — i.e. it fires whenever *any* prior beat produced *any* text, which in practice is almost every turn once a scene has started.

**A. `sceneContext` growth** — cap to last **2 beats** or **~1500 characters** (config constant) when building downstream agent prompts.

**B. Inactive-player LLM** — gate unless:

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

**Confirmed: still the worst-case cost center in the app, entirely unimplemented.** `resolveNonPlayerCatchUp` (`src/main/combatResolvers.ts`) loops up to `MAX_COMBAT_CATCHUP_TURNS` (`src/shared/combat/types.ts`) and calls `resolveNpcCombatTurn`, which calls `generateNpcReaction(provider, npc, assembleNpcContext(db, npc), 'Combat turn')` for **every** NPC turn before hit/damage are engine-resolved — flavor-only, no template path, no `COMBAT_LLM_FLAVOR` flag exists. `resolvePartyCombatTurn` likewise always calls `decidePartyMemberAction` (LLM) for party members. Worst case: up to 10 LLM calls per single player combat action.

Hit/miss/damage are engine-resolved immediately after — the LLM only supplies flavor.

Replace default combat flavor with deterministic templates keyed by:

- `temperament`, `disposition`, hit/miss, crit (optional)
- speaking vs non-speaking (`reactionKind` / `**` action markers per **028**)

Reserve `generateNpcReaction` LLM for:

- speaking NPCs on crit or yield-adjacent moments (config flag), **or**
- one batched "round flavor" call per catch-up sequence (stretch goal — document if deferred)

Party member combat turns (`resolvePartyCombatTurn`) can use short templates similarly.

#### Acceptance Criteria

- [ ] Default combat catch-up produces zero `provider.generate` calls for NPC/party flavor
- [ ] Template output uses correct `reactionKind` and emphasis conventions
- [ ] Existing combat tests updated; player attack/yield/damage semantics unchanged
- [ ] Optional `COMBAT_LLM_FLAVOR=true` env or setting restores LLM flavor for manual QA (document in runbook)

---

### 040.7 XP and loot template defaults

#### Description

**Confirmed: LLM is still the unconditional default for both.** The relevant files are `src/main/progressionPipeline.ts` and `src/main/lootPipeline.ts` (not the names the first draft guessed). `resolveXpAward` (`src/agents/xp.ts`) always calls `provider.generate`; the engine `budget.suggested` value is used only as a **fallback after `MAX_SCHEMA_ATTEMPTS` parse failures**, never as a default skip-LLM path. `resolveLoot` (`src/agents/loot.ts`) has the identical shape. No `enrichRewardNarration` setting exists anywhere.

Make **template narration the default path**:

- XP amount: always `budget.suggested` (or clamped engine value) — no LLM required
- Loot grants: engine/catalog retrieval path selects items; template `lootNarration` from grant names

Add optional `enrichRewardNarration` setting (default **false**) that calls LLM for flavor-only rewrites of template text. When false, the XP and loot passes in `progressionPipeline.ts` / `lootPipeline.ts` skip agent calls entirely.

#### Acceptance Criteria

- [ ] Encounter end + quest complete award XP/loot with **no** LLM when enrichment disabled
- [ ] Template narration is grammatically acceptable one-liner per source type
- [ ] Setting enables prior LLM flavor behavior without code path deletion
- [ ] `encounterQuestLootSmoke.test.ts` and progression tests pass with enrichment off

---

### 040.8 Rules-first yield and defeat disposition

#### Description

**Confirmed: mostly unimplemented, but defeat disposition already has one real rules-first shortcut worth preserving and extending.** `proposeDefeatDisposition` (`src/agents/defeatDisposition.ts`) already skips the LLM entirely for non-speaking victors, returning a hardcoded disposition with zero `provider.generate` calls — keep this. All speaking-victor defeats still always call the LLM, with only a single hardcoded fallback string on schema exhaustion.

`proposeYieldOutcome` (`src/agents/yieldReview.ts`) always calls the LLM; its `defaultYieldOutcome` function is a thin 3-branch fallback used only after retries are exhausted (non-lethal→incapacitated, villager tier→surrender, else incapacitated) — far short of the temperament/tier/lethality/alignment rules table this ticket calls for, and it's a parse-failure fallback, not a pre-LLM short-circuit.

Invert default:

**Yield** (`yieldReview.ts`): evaluate temperament + `combatTier` + lethality + `allowedOutcomes` with a pure rules function (extend `defaultYieldOutcome` into a real decision table). Call LLM only when rules return `ambiguous` (e.g. veteran tier + multiple allowed outcomes).

**Defeat** (`defeatDisposition.ts`): map alignment + backstory keywords + `deathMode` to disposition table before LLM, for **speaking** victors too (non-speaking already skips). Non-speaking victors keep their existing skip unchanged.

#### Acceptance Criteria

- [ ] Pure unit tests for rules tables cover cowardly surrender, beast flee, fanatic fight_on, non-lethal incapacitated, lawful imprison, etc.
- [ ] LLM call count for yield/defeat drops to near-zero in scripted combat tests
- [ ] Narration hints still produced from rules (template strings)
- [ ] LLM fallback preserved when rules return `ambiguous`
- [ ] Non-speaking-victor defeat skip (already working) is unaffected

---

### 040.9 Shared `systemPrompt` for JSON schemas and emphasis guidance

#### Description

**Confirmed: the plumbing already exists, adoption does not.** `GenerateContext.systemPrompt?: string` is already defined (`src/agents/providers/types.ts`) and both the Claude and Player2 adapters already handle it correctly — but it is used **only in tests** (`player2.test.ts`, `types.test.ts`), not by a single production agent call site. This ticket is now purely about adoption, not plumbing.

Repeated per-prompt boilerplate still inflates **input** tokens on every call:

- `Respond ONLY with JSON: { ... }` blocks hand-written per prompt builder in `dm.ts`, `turnReview.ts`, `npc.ts`, `xp.ts`, `loot.ts`, `yieldReview.ts`, `defeatDisposition.ts`
- `NARRATIVE_EMPHASIS_GUIDANCE` / `NPC_EMPHASIS_GUIDANCE` (`src/shared/textEmphasis.ts`) are already centralized as *constants* but are appended into the **user** prompt on every call (`dm.ts`, `npc.ts`), not passed via `systemPrompt`

Add `src/agents/sharedSystemPrompts.ts` with:

- `AGENT_JSON_CONTRACT_SYSTEM` — global rules (JSON only, no markdown fences, untrusted player text)
- per-agent schema fragments registered once

Pass via `provider.generate(prompt, { systemPrompt, maxTokens })`. User message retains turn-specific context only.

**Synergy with 040.10**: the guided-identity static "established fact" identity block (race lore, background, alignment, archetype, ability scores) is a great candidate to move into `systemPrompt` too, since it's static per-character across the whole interview — see 040.10.

#### Acceptance Criteria

- [ ] DM, turn review, NPC, loot, XP agents use shared system prompt; user prompts measurably shorter (snapshot or character-count test)
- [ ] Claude and Player2 adapters both receive system message correctly (existing `player2.test.ts` pattern)
- [ ] Schema validation tests still pass
- [ ] `NARRATIVE_EMPHASIS_GUIDANCE`/`NPC_EMPHASIS_GUIDANCE` move from user prompt to `systemPrompt` where the call site allows it

---

### 040.10 Guided identity transcript windowing (+ static identity block hygiene)

#### Description

**Confirmed unwindowed, and confirmed a new, larger cost surface since 049/050 landed.** `buildIdentityInterviewPrompt` (`src/agents/guidedIdentity.ts`) sends `JSON.stringify(context.transcript)` — the entire array, unsliced — on every single interview turn. O(n²) growth over a long interview, exactly as originally suspected.

**New since the first draft**: `buildIdentityContextLines` (called from both the kickoff prompt and every interview turn) now also injects, via `buildMechanicalCharacterBlock`, the full `RaceLore` object when set (`summary`, `appearance`, `culture`, `roleInThisLand`, `hooks: string[]` — several sentences per field, from epic 049) plus `backgroundLabel`/`backgroundDescription` and the full `backgroundStory` personal prose (~2 paragraphs, from epic 050). All of this is **static for the whole interview** but is currently re-sent verbatim as free-form user-prompt text on **every turn**, compounding with the unwindowed transcript. This is the single biggest new prompt-size driver this epic needs to account for.

Window the transcript to last **4–5** exchanges. Always include `currentFoundations` summaries (locked-in `who`/`why`/`where`/`what` summaries) even when their turns aged out of the window. Separately — and this is the new part — **move the static mechanical/identity block (race lore, background, alignment, archetype, ability scores) into `systemPrompt` (040.9) instead of re-serializing it into the user prompt every turn**, since it does not change during the interview.

#### Acceptance Criteria

- [ ] Prompt includes at most 5 transcript turns plus all completed foundation summaries
- [ ] Unit test: 10-turn fixture produces same-sized transcript section regardless of turns 1–5 content
- [ ] The static mechanical/identity block (race lore + background + alignment + archetype + ability scores) is sent once via `systemPrompt`, not re-serialized into the user prompt on every turn
- [ ] `guidedCreationSmoke.test.ts` still passes

---

### 040.11 Parallelise campaign NPC shortfall fill

#### Description

**Confirmed still fully serial**, and confirmed there's a real ordering dependency to solve, not just a "swap in Promise.all" job. `fillCampaignNpcShortfall` (`src/agents/campaignGeneration/index.ts`) loops regions and, per region, does a `while (shortfall > 0)` loop with sequential `await generateSingleNpc(...)` calls — each one checks the new NPC's name against **all names generated so far in this batch** (`allNames()`) before continuing. Naive `Promise.all` breaks this: two concurrent calls can't see each other's in-flight names and may collide.

Parallelise per region batch (respect rate limits with optional concurrency cap of 3–5), but **generate first, then de-duplicate/regenerate collisions in a second pass** rather than relying on serial-only name checking. Document the collision-handling strategy explicitly in the implementation.

#### Acceptance Criteria

- [ ] Shortfall fill issues parallel requests; test mocks confirm concurrent calls
- [ ] Name collisions between concurrently-generated NPCs in the same batch are detected and resolved (regenerate or rename), not silently allowed through
- [ ] Generation result has the same NPC count per region as serial ordering
- [ ] Failed single NPC does not fail entire batch — same partial behavior as today

---

### 040.12 Efficiency smoke test + call-count regression

#### Description

**Confirmed: does not exist at all** — no `llmEfficiency.smoke.test.ts`, no runbook, no call-count regression fixture covering turn/combat/inactive-player scenarios (only ad hoc `provider.calls.length` checks inside `campaignGeneration.test.ts`, which doesn't cover this epic's scenarios).

Add `src/agents/llmEfficiency.smoke.test.ts` (or extend existing smoke harness) using `createMockProvider` to assert **LLM call counts** per scenario:

| Scenario | Max calls (after epic) |
|----------|------------------------|
| Simple dialogue, 1 NPC, no check | 1 (merged intent+routing) or 0 with heuristic |
| Check + narration | 2 (merged routing + narrate) or 1 with heuristic + narrate |
| Combat player attack, 2 NPC catch-up | 1 intent + 0 flavor (040.6) + optional yield |
| Encounter end rewards, enrichment off | 0 XP/loot LLM |
| Flag a new NPC, race already realized | 2 (bundle + details, see 040.13) |
| Flag a new NPC, race not yet realized | 3 (bundle + race-lore-realize + details, see 040.13) |

Also snapshot **prompt character counts** for `assembleNarrationContext` before/after 040.4 (fixture campaign), and for `buildIdentityInterviewPrompt` before/after 040.10.

Update or add `docs/runbooks/llm-efficiency-smoke-test.md` with manual verification steps and optional dev metrics (`provider.calls.length`).

Depends on **040.1–040.7 and 040.13** at minimum; run full suite after all tickets.

#### Acceptance Criteria

- [ ] Automated smoke tests assert call-count ceilings per scenario, including both flagged-NPC scenarios (race realized / not yet realized)
- [ ] Prompt size regression fixture documents slim context savings (turn context) and identity block savings (guided identity)
- [ ] Runbook lists scenarios and expected call budget
- [ ] `npm test`, `npm run lint`, `npm run build` pass with epic complete

---

### 040.13 Flagged-NPC generation call-count tracking (049–052 fallout)

#### Description

Epic **052** (NPC core identity bundle) deliberately restructured single-NPC "flagged" generation (Campaign Review's **Generate NPC** action → `generateNpcForCampaign` → `generateFlaggedNpc` in `src/agents/campaignGeneration/flaggedNpc.ts`) from one LLM call into a two-phase pipeline, specifically so the backstory-writing step could be grounded in the NPC's *full* realized race lore rather than a one-line blurb. That's a legitimate quality tradeoff — this ticket does not propose reverting it — but it landed **after** this efficiency epic was drafted, so nothing here accounts for the new cost, and it's the single biggest call-count regression introduced anywhere in the codebase since 040's first draft.

**Confirmed current cost per new speaking NPC via this path:**

1. `generateNpcCoreBundle` (phase 1) — LLM call, decides `canSpeak`/`temperament`/race/gender/alignment/class only, no name or backstory
2. `resolveOrRealizeCampaignRace` → `generateRaceLore` — LLM call, **only if** the chosen race isn't already realized in this campaign (zero calls if it is — `getCampaignRaceByKey` short-circuits)
3. `generateFlaggedNpcDetails` (phase 2) — LLM call, writes name/role/disposition/backstory grounded in the full lore + region history + gender/class/background blurbs

**= 3 calls worst case (new race), 2 calls steady-state (race already realized in this campaign)** — versus 1 call (or 2, with the same pre-existing race-realize call) before epic 052. Bulk/additional-region NPC generation and the shortfall top-up (`generateSingleNpc`) were deliberately left on the one-shot path by 052 and are **not** affected — only the single flagged-NPC path grew.

This ticket's job is to make sure that deliberate cost is **measured, bounded, and as cheap as it can be per-call**, not to re-architect 052's design:

- Apply 040.1's tightened `maxTokens` to both `flaggedNpc.ts` calls (phase 1 in particular is currently 2048 for a tiny JSON object — see 040.1)
- Apply 040.9's shared `systemPrompt` to both phases once it exists, to cut repeated JSON-contract/emphasis boilerplate across what is now a 2–3 call sequence for one user action
- Add the two flagged-NPC scenarios (race realized / not yet realized) to 040.12's call-count regression suite as **explicit, tracked ceilings** (2 and 3 respectively) so a future change can't silently push this to 4+
- Confirm (regression test) that bulk and additional-region NPC generation remain on the one-shot path and are not accidentally migrated to the two-phase pipeline by a future change

#### Acceptance Criteria

- [ ] `flaggedNpc.ts`'s phase-1 (`generateNpcCoreBundle`) and phase-2 (`generateFlaggedNpcDetails`) calls both pass tuned `maxTokens` (coordinated with 040.1)
- [ ] Both `flaggedNpc.ts` calls adopt shared `systemPrompt` for their JSON-contract/emphasis boilerplate (coordinated with 040.9)
- [ ] Call-count regression test (040.12) asserts exactly 2 calls when the chosen race is already realized in the campaign, and exactly 3 when it is not
- [ ] Regression test confirms bulk campaign generation, additional-region generation, and shortfall top-up still issue exactly one LLM call per NPC (no accidental migration to the two-phase pipeline)
- [ ] No change to `generateFlaggedNpc`'s output shape or the established-identity-before-flavor-text ordering — this ticket tunes cost, it does not change what gets generated or when
