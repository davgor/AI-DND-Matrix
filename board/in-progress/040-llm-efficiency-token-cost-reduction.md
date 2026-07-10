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

## Data-integrity review (pre-implementation hole-poking)

A dedicated pass mapped every DB write on the affected paths against each proposed change, to find where "fewer/cheaper LLM calls" silently becomes "data never written" or "garbage written permanently". The architecture makes this worse than it looks: **every agent call is re-grounded from SQLite**, so a skipped write doesn't just lose one line of history — it degrades every future prompt that would have been grounded on it, compounding quietly. Findings below are binding on implementation; per-ticket acceptance criteria were amended to match.

**Severity-ordered holes:**

1. **(040.3, critical) The `dmNarration` beat is the *only* write path for nearly all world state.** World facts, quest proposals/updates/completions (and the XP/loot reward passes they trigger), log book entries, cross-character log entries, journal entries, item grants, commerce, spell grants, alignment shifts, story-driven death, and opening-scene updates all flow exclusively through `narrate` → `persistNarrationSideEffects` (`dm.ts`), which only runs when the routing plan includes a `dmNarration` beat. A heuristic that routes "converse: npcResponse only" or "act: playerActionExpression only" on a turn where LLM routing would have included `dmNarration` amputates all of those writes for that turn — no error, no fallback, no backfill. A keyword heuristic cannot see that "ask the innkeeper about the amulet" should tick a quest objective or write a log entry. Guardrails added to 040.3's AC.

2. **(040.2, high) Merging intent + routing removes the engine check outcome from routing's inputs.** Today `reviewTurn` receives the *resolved* `checkOutcome` and its prompt marks it authoritative ("narration beat must reflect this"). A single merged call necessarily produces the routing plan *before* the d20 is rolled, so routing can no longer condition on success/failure. Mitigation (now in 040.2's AC): when the merged response says `checkNeeded: true`, deterministically force a `dmNarration` beat into the plan post-hoc (the outcome-bearing beat), or fall back to the two-call path for check turns.

3. **(040.1, high) `maxTokens` truncation is invisible and two agents persist garbage on it.** `claude.ts` does not inspect `stop_reason`; a truncated response just returns partial text. Schema loops retry the *identical* prompt with the *identical* cap — a structurally-too-small cap fails deterministically all `MAX_SCHEMA_ATTEMPTS` times. Then per-agent fallbacks diverge: XP falls back to `budget.suggested` (benign); loot falls back to `nothingToFind: true` (**players silently receive no loot**); `narrate` has **no retry loop at all** — one truncated response persists the raw JSON fragment as `narrationText` into `events` permanently *and* drops every structured side-effect field; `generateNpcReaction` likewise persists raw text as dialogue **and as an NPC memory row**; a guided-identity `dmReply` truncated inside still-valid JSON is persisted verbatim into the transcript. Tightening caps without truncation detection converts a cost bug into a corruption bug. 040.1's AC now requires `stop_reason` handling first.

4. **(040.4, high) The slim `logBookEntries` shape must keep `id`.** The proposed slim shape says "omit internal ids/dates if not needed for grounding" — but `logBookAmendments`/`logBookDeletions` work by the LLM echoing an `entryId` it read from the prompt, and `persistLogBookAmendments`/`persistLogBookDeletions` silently no-op unknown ids. Dropping `id` permanently disables log-book self-maintenance with zero errors. 040.4's table and AC corrected.

5. **(040.8, high) Yield/defeat rules tables decide persisted life-and-death state, not flavor.** Yield `outcome` writes `npcs.encounter_outcome`, sets `alive = false` on `slain`, rewrites disposition on `surrender`, and gates XP *and* loot eligibility (`flee` earns neither). A rules table biased toward `flee` where the LLM chose `surrender` changes who is alive and what players earn. The prompt's safety rule ("non-lethal intent or mercy → never `slain`") must become a hard invariant of the table, not guidance. Defeat disposition additionally persists an LLM-only `locationTag` field (imprison/ransom continuity) that the proposed rules table never produces — template it per disposition or explicitly accept the loss. 040.8's AC amended.

6. **(040.5 + 040.3 compounding, medium) Gating the inactive proxy erases inactive characters' only narrative record.** `inactive_player_action` events are both the only per-turn record of inactive characters and the only grounding for their *future* proxy calls (`buildNarrationSnippetsForCharacter`). There is no backfill. Worse, the two gates compound: `npcResponse` beats never append to `sceneContext`, so converse-only turns *already* skip the proxy today — add 040.3's converse fast path and 040.5's signal gate and inactive characters can go silent for entire sessions, while 040.3 simultaneously reduces the `crossCharacterLogBookEntries` writes that are their other continuity channel. The cap in part A must apply at prompt-build time, not to the accumulating state (the loop appends actions back into `sceneContext`).

7. **(040.7, medium) Loot's "engine/catalog retrieval path" does not exist yet — the LLM currently *selects* items.** `resolveLootPolicy` produces only an envelope (allowed types, max rarity, max grant count); the LLM picks among pre-filtered catalog candidates and may `proposeNew` homebrew items that are **persisted into the catalog** (`upsertCatalogItemByName`, name-deduped). A deterministic selector must be designed (pick strategy, variety), and turning enrichment off also turns off organic homebrew catalog growth — accept and document that. XP: defaulting to `budget.suggested` changes persisted progression amounts (in-band, deliberate) and makes the `xp_awarded.clamped` flag permanently false — fine, but state it in the ticket so nobody "fixes" it later.

8. **(040.10, medium) There is no final full-transcript summarization pass to fall back on.** Identity foundations are extracted incrementally per turn by the LLM reading the (currently full) transcript; the four `identity_*` columns are the only durable output — the transcript is never re-processed after the phase completes. Windowing to 4–5 exchanges means a foundation the player established in turn 3 but the model only locks at turn 10 gets summarized from evicted context: thin, wrong, or never locked. Two existing sharp edges get more dangerous under windowing: `mergeFoundationStatus` **overwrites** already-locked summaries when the model re-emits `complete: true`, and `allFoundationsComplete: true` can advance the phase with null identity columns. 040.10's AC amended.

9. **(040.6, low — with one landmine) Combat flavor templating is genuinely safe, but only at the call sites.** Verified: combat catch-up writes no NPC memories, ignores the LLM `attack` flag (engine always rolls), and persists only engine-authored `combat_attack` payloads — templates lose only ephemeral `TurnResult.npcReactions` text and `party_member_action` event prose. **But** `generateNpcReaction` is the same function used on the non-combat path, where `reaction.text` is persisted as an NPC memory and `attack: true` triggers a real engine attack. The template path must be introduced in `resolveNpcCombatTurn`/`resolvePartyCombatTurn`, never inside the shared agent.

10. **(040.11, low) The ticket's AC mischaracterizes today's failure behavior.** "Failed single NPC does not fail entire batch — same partial behavior as today" is wrong: today `fillCampaignNpcShortfall` returns `undefined` on *any* single failure, discarding the whole repair (caller falls back to the unrepaired result); only the *initial* generation skips failed slots. Pick and state the intended semantics. The fill itself is pre-persist and in-memory (no SQLite concurrency risk), but parallelism must **not** leak into the persist phase: `resolveOrRealizeCampaignRace` is check-then-insert against `UNIQUE(campaign_id, race_key)` and would throw under concurrent same-race NPCs.

11. **(040.9, low)** Both adapters already handle `systemPrompt` correctly. The one hole: schema-retry loops currently pass *no* `GenerateContext` — when adopting, every retry attempt must pass the same context object, and a test should assert retries carry `systemPrompt` + `maxTokens`.

12. **(040.13, informational)** Phase-2 failure after a phase-2-triggered race realize leaves an orphan `campaign_races` row. This is benign and desirable (idempotent — the next NPC of that race short-circuits the lore call); document as intended, don't "clean it up".

**Useful test-design fact:** `TurnRoutingPlan.disposition` is validated but never read at runtime — only `beats` drives execution. 040.2/040.3 tests must assert on beats, not disposition.

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
- **no silent data loss:** every hole in the "Data-integrity review" section above is covered by its amended per-ticket acceptance criteria before the corresponding sub-ticket is marked done

040.1 maxTokens on all agents · 040.2 merge interpretIntent + reviewTurn · 040.3 heuristic routing fast path · 040.4 slim scene context serializers · 040.5 cap sceneContext + gate inactive-player proxy · 040.6 combat catch-up flavor without per-combatant LLM · 040.7 XP/loot template defaults · 040.8 rules-first yield + defeat disposition · 040.9 shared systemPrompt for schemas · 040.10 guided identity transcript windowing (+ static identity block hygiene) · 040.11 parallelise NPC shortfall fill · 040.12 efficiency smoke + call-count regression · 040.13 flagged-NPC generation call-count tracking (049–052 fallout) · 040.14 adaptive token ceilings (truncation escalation + knowledge-aware context budgets)

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

- [x] Grep for `provider.generate(` shows `maxTokens` passed (directly or via helper) at every production call site except documented exceptions
- [x] `flaggedNpc.ts`'s `CORE_BUNDLE_MAX_TOKENS` is tuned down from 2048 to the structured-JSON band (256–384) with a comment explaining why
- [x] Unit test or snapshot asserts key agents pass expected `maxTokens` to mock provider
- [x] No agent regression: schema retry paths still succeed on valid model output
- [x] Comment or small table in `src/agents/providers/types.ts` (or adjacent README) documents band rationale
- [x] **Truncation guard (do this first):** `claude.ts` inspects `stop_reason` and surfaces `max_tokens` truncation as a failure (or retry-with-larger-cap) instead of returning partial text — without this, tight caps make `narrate` persist raw truncated JSON into `events` and `generateNpcReaction` persist it as dialogue + an NPC memory row (both are single-shot with raw-text fallbacks, no retry loop)
- [ ] Caps on agents whose output is persisted verbatim (`narrate`, `generateNpcReaction`, guided identity/opening scene `dmReply`, `backgroundStory`, `obituary`) are validated against real recorded output sizes before landing, not just the band table — **remaining:** no real provider credentials were available in the implementation environment, so caps were reasoned from schema + prompt instructions (documented in per-call-site comments) and chosen generously; the new `stop_reason`/`finish_reason` truncation guard means an undershot cap now fails loudly and retries instead of persisting garbage. Close this by playing one manual session with a real provider (a few narration turns, an NPC reaction, a guided-identity interview, a background story, an obituary) and confirming no `TruncationError` occurs; bump any cap that trips it.

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

- [x] Non-combat routed turn uses **one** LLM call for intent + routing plan under default path
- [x] Combat intent validation and engine check resolution behave identically to pre-merge (existing `dm.test.ts`, `turnIpc` tests updated)
- [x] Invalid combined schema retries up to `MAX_SCHEMA_ATTEMPTS`; throws `DmSchemaError` on exhaustion
- [x] `reviewTurn` export retained as thin wrapper or deprecated with redirect for tests — no duplicate production call path
- [x] **Check-outcome hole closed:** today `reviewTurn` sees the resolved `checkOutcome` (authoritative in its prompt); the merged call routes *before* the roll. When the merged response has `checkNeeded: true`, a `dmNarration` beat is deterministically ensured in the plan post-parse (or the turn falls back to two calls) so check outcomes always reach a narration beat and its side-effect writes
- [x] Tests assert on `plan.beats` (executed), not `plan.disposition` (validated but never read at runtime)

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

- [x] Pure unit tests cover each heuristic row + `null` fallback cases
- [x] `resolveRoutedTurn` uses heuristic plan when non-null; otherwise merged/split LLM routing
- [x] No regression on composite turns (action + check + NPC) — those must fall through to LLM
- [x] Telemetry or debug log (dev-only) records `heuristic` vs `llm` routing source for smoke validation
- [x] **Side-effect starvation guard:** `dmNarration` is the sole write path for world facts, quests (and their XP/loot rewards), log book, cross-character log entries, journal, item grants, commerce, spells, alignment, and story-driven death — heuristic rows that omit it (`converse`-only, `act`-only) must return `null` (defer to LLM) whenever any signal suggests state could change: active quest whose objective text mentions a present NPC/region keyword, pending alignment shift, first interaction with an NPC this session, or player input containing transactional verbs (buy/sell/give/take/learn). The heuristic may only skip `dmNarration` on turns it can *prove* are inert
- [x] Integration test: a scripted quest-advancing dialogue turn routed by the heuristic still results in the quest objective ticking (i.e. it fell through to LLM routing) — the failure mode being guarded is silent, so it needs an explicit test

---

### 040.4 Slim scene context serializers

#### Description

**Confirmed partially done, but not the part this ticket is about.** Count-windowing already exists and is out of scope to redo: `src/agents/contextWindow.ts`'s `takeRecent` (`DEFAULT_RECENCY_WINDOW=20`) caps `recentEvents`, and `src/agents/logBookWindow.ts`'s `windowLogEntriesForNarration` (`LOG_ENTRIES_PER_CATEGORY_LIMIT=5`) caps log entries per category. **What's actually missing is field-shape slimming** — every event/log-entry object that survives the count window is still the full raw DB row. `NarrationContext.recentEvents` is typed `Event[]` (the full `{ id, campaignId, timestamp, type, payload }` shape) and serialized via raw `JSON.stringify(context.recentEvents)` in both `dm.ts` and `turnReview.ts`; `logBookEntries` is the full `LogEntry` row (`id, campaignId, characterId, category, title, content, relatedEntityId, learnedInGameDate, createdAt`), also raw-stringified.

Introduce shared slim serializers used by `assembleNarrationContext`, `buildTurnReviewPrompt`, `buildNarrationPrompt`, and NPC/party/inactive agents. Stop sending full DB rows when a summary suffices — this ticket is purely about shape, not count (that's already solved).

| Field | Today | Slim shape |
|-------|-------|------------|
| `recentEvents` | full `Event` JSON (id, timestamp, type, entire payload) | `{ type, narrationText?: string, summary?: string }` — derive summary from known payload keys |
| `logBookEntries` | full `LogEntry` | `{ id, category, title, content, relatedEntityId? }` — **`id` must stay**: log-book amendments/deletions work by the LLM echoing an `entryId` read from the prompt, and the persist functions silently no-op unknown ids. Omit `campaignId`/`characterId`/dates only |
| NPC `worldFacts` | all region facts, unbounded | `takeRecent` (e.g. 10) + content string only |
| NPC `memories` | full memory rows | `{ content }` or content + timestamp |
| party `relationshipEvents` | full events | same slim event shape as above |

Live in `src/agents/contextSlim.ts` (new file — confirmed nothing like it exists today). `assembleNarrationContext` returns slim types; update `NarrationContext` interface.

#### Acceptance Criteria

- [x] `assembleNarrationContext` uses slim serializers; prompts no longer include event `id` / `campaignId` / raw payload blobs
- [x] Unit tests: serializer output size bounded; wolf-bandit-logbook regression fixtures unchanged in **meaning** for narration tests
- [x] NPC context assembly windows world facts (max N) and slim memories
- [x] Party member context uses slim events
- [x] **Log-book `id` preserved in slim shape**, and a regression test proves a `logBookAmendments`/`logBookDeletions` round-trip still works post-slimming (LLM echoes an id it saw in the prompt; persist functions silently skip unknown ids, so this failure mode is otherwise invisible)

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

- [x] `sceneContext` passed to NPC/party/inactive agents is capped; unit test asserts cap applied
- [x] Inactive-player LLM skipped on simple converse-only turns with no cross-character signal
- [x] Inactive-player LLM still fires when cross-character log writes or shared-scene cues present (integration test)
- [x] No change to event append semantics or `TurnResult` shape
- [x] Cap applied at **prompt-build time only**, not to the accumulating `BeatExecutionState.sceneContext` (the inactive-player loop appends actions back into it; truncating the state itself would drop earlier beats from later same-turn prompts)
- [x] **Compounding-starvation check:** `inactive_player_action` events are both the inactive character's only per-turn record and the only grounding for their future proxy calls — there is no backfill. Since `npcResponse` beats never touch `sceneContext`, converse-only turns already skip the proxy today; with 040.3's converse fast path layered on, an integration test must show inactive characters still act within a bounded number of mixed turns (not silent for a whole scripted session)

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

- [x] Default combat catch-up produces zero `provider.generate` calls for NPC/party flavor
- [x] Template output uses correct `reactionKind` and emphasis conventions
- [x] Existing combat tests updated; player attack/yield/damage semantics unchanged
- [x] Optional `COMBAT_LLM_FLAVOR=true` env or setting restores LLM flavor for manual QA (document in runbook)
- [x] Template path lives in `resolveNpcCombatTurn` / `resolvePartyCombatTurn` (the combat call sites), **not** inside `generateNpcReaction` / `decidePartyMemberAction` — the same agents serve the non-combat path where `reaction.text` is persisted as an NPC memory and `attack: true` triggers a real engine attack; test asserts non-combat NPC reactions still write `npc_memories` and can still attack

---

### 040.7 XP and loot template defaults

#### Description

**Confirmed: LLM is still the unconditional default for both.** The relevant files are `src/main/progressionPipeline.ts` and `src/main/lootPipeline.ts` (not the names the first draft guessed). `resolveXpAward` (`src/agents/xp.ts`) always calls `provider.generate`; the engine `budget.suggested` value is used only as a **fallback after `MAX_SCHEMA_ATTEMPTS` parse failures**, never as a default skip-LLM path. `resolveLoot` (`src/agents/loot.ts`) has the identical shape. No `enrichRewardNarration` setting exists anywhere.

Make **template narration the default path**:

- XP amount: always `budget.suggested` (or clamped engine value) — no LLM required
- Loot grants: engine/catalog retrieval path selects items; template `lootNarration` from grant names

Add optional `enrichRewardNarration` setting (default **false**) that calls LLM for flavor-only rewrites of template text. When false, the XP and loot passes in `progressionPipeline.ts` / `lootPipeline.ts` skip agent calls entirely.

#### Acceptance Criteria

- [x] Encounter end + quest complete award XP/loot with **no** LLM when enrichment disabled
- [x] Template narration is grammatically acceptable one-liner per source type
- [x] Setting enables prior LLM flavor behavior without code path deletion
- [x] `encounterQuestLootSmoke.test.ts` and progression tests pass with enrichment off
- [x] **Deterministic loot selector designed and documented** — no engine item-picker exists today (`resolveLootPolicy` is only an envelope; the LLM currently *selects* items and can `proposeNew` catalog rows): define pick strategy (e.g. seeded random among policy-filtered candidates), respect `maxGrantCount`, and add a variety guard so repeated encounters don't grant identical items
- [x] Ticket documents two accepted behavior changes so they aren't later mistaken for bugs: persisted XP amounts become `budget.suggested` (midpoint, in-band; `xp_awarded.clamped` always false) and homebrew catalog growth via `proposeNew` stops while enrichment is off

---

### 040.8 Rules-first yield and defeat disposition

#### Description

**Confirmed: mostly unimplemented, but defeat disposition already has one real rules-first shortcut worth preserving and extending.** `proposeDefeatDisposition` (`src/agents/defeatDisposition.ts`) already skips the LLM entirely for non-speaking victors, returning a hardcoded disposition with zero `provider.generate` calls — keep this. All speaking-victor defeats still always call the LLM, with only a single hardcoded fallback string on schema exhaustion.

`proposeYieldOutcome` (`src/agents/yieldReview.ts`) always calls the LLM; its `defaultYieldOutcome` function is a thin 3-branch fallback used only after retries are exhausted (non-lethal→incapacitated, villager tier→surrender, else incapacitated) — far short of the temperament/tier/lethality/alignment rules table this ticket calls for, and it's a parse-failure fallback, not a pre-LLM short-circuit.

Invert default:

**Yield** (`yieldReview.ts`): evaluate temperament + `combatTier` + lethality + `allowedOutcomes` with a pure rules function (extend `defaultYieldOutcome` into a real decision table). Call LLM only when rules return `ambiguous` (e.g. veteran tier + multiple allowed outcomes).

**Defeat** (`defeatDisposition.ts`): map alignment + backstory keywords + `deathMode` to disposition table before LLM, for **speaking** victors too (non-speaking already skips). Non-speaking victors keep their existing skip unchanged.

#### Acceptance Criteria

- [x] Pure unit tests for rules tables cover cowardly surrender, beast flee, fanatic fight_on, non-lethal incapacitated, lawful imprison, etc.
- [x] LLM call count for yield/defeat drops to near-zero in scripted combat tests
- [x] Narration hints still produced from rules (template strings)
- [x] LLM fallback preserved when rules return `ambiguous`
- [x] Non-speaking-victor defeat skip (already working) is unaffected
- [x] **Hard invariants, not guidance:** yield table never returns `slain` when lethality is `non_lethal` or mercy is offered (today only a prompt guideline), always returns an outcome within `allowedOutcomes` ∪ `fight_on`, and never returns `surrender` for `canSpeak: false`. Property-style test over the input space — the outcome writes `encounter_outcome`, kills NPCs (`alive = false`), rewrites disposition, and gates XP *and* loot eligibility (`flee` earns neither), so a biased table changes persisted world state, not flavor
- [x] Defeat rules table produces `locationTag` (or explicitly documents dropping it) — today it's an LLM-only field persisted into `playerDefeatState` and the `player_defeated` event for imprison/ransom continuity

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

- [x] DM, turn review, NPC, loot, XP agents use shared system prompt; user prompts measurably shorter (snapshot or character-count test)
- [x] Claude and Player2 adapters both receive system message correctly (existing `player2.test.ts` pattern)
- [x] Schema validation tests still pass
- [x] `NARRATIVE_EMPHASIS_GUIDANCE`/`NPC_EMPHASIS_GUIDANCE` move from user prompt to `systemPrompt` where the call site allows it
- [x] Schema-retry loops pass the same `GenerateContext` (systemPrompt + maxTokens) on **every** attempt — today the loops pass no context at all, so this is easy to get wrong on attempt 2+; a test asserts the mock provider received identical context across retries

---

### 040.10 Guided identity transcript windowing (+ static identity block hygiene)

#### Description

**Confirmed unwindowed, and confirmed a new, larger cost surface since 049/050 landed.** `buildIdentityInterviewPrompt` (`src/agents/guidedIdentity.ts`) sends `JSON.stringify(context.transcript)` — the entire array, unsliced — on every single interview turn. O(n²) growth over a long interview, exactly as originally suspected.

**New since the first draft**: `buildIdentityContextLines` (called from both the kickoff prompt and every interview turn) now also injects, via `buildMechanicalCharacterBlock`, the full `RaceLore` object when set (`summary`, `appearance`, `culture`, `roleInThisLand`, `hooks: string[]` — several sentences per field, from epic 049) plus `backgroundLabel`/`backgroundDescription` and the full `backgroundStory` personal prose (~2 paragraphs, from epic 050). All of this is **static for the whole interview** but is currently re-sent verbatim as free-form user-prompt text on **every turn**, compounding with the unwindowed transcript. This is the single biggest new prompt-size driver this epic needs to account for.

Window the transcript to last **4–5** exchanges. Always include `currentFoundations` summaries (locked-in `who`/`why`/`where`/`what` summaries) even when their turns aged out of the window. Separately — and this is the new part — **move the static mechanical/identity block (race lore, background, alignment, archetype, ability scores) into `systemPrompt` (040.9) instead of re-serializing it into the user prompt every turn**, since it does not change during the interview.

#### Acceptance Criteria

- [x] Prompt includes at most 5 transcript turns plus all completed foundation summaries
- [x] Unit test: 10-turn fixture produces same-sized transcript section regardless of turns 1–5 content
- [x] The static mechanical/identity block (race lore + background + alignment + archetype + ability scores) is sent once via `systemPrompt`, not re-serialized into the user prompt on every turn
- [x] `guidedCreationSmoke.test.ts` still passes
- [x] **Delayed-lock-in protection:** foundations are extracted incrementally per turn and the transcript is never re-processed after phase completion — the four `identity_*` columns are the only durable output. Under windowing, `mergeFoundationStatus` must stop **overwriting** an already-locked summary when the model re-emits `complete: true` (a re-emit summarized from a window that no longer contains the original discussion would silently replace a good summary with a thin one); locked summaries become append/keep-first
- [x] Phase completion requires all four `identity_*` summaries to be non-null — the current `allFoundationsComplete: true` model-flag bypass (which can advance the phase with null identity columns) is closed or explicitly re-justified, since windowing raises the odds the model claims completion without having locked everything

---

### 040.11 Parallelise campaign NPC shortfall fill

#### Description

**Confirmed still fully serial**, and confirmed there's a real ordering dependency to solve, not just a "swap in Promise.all" job. `fillCampaignNpcShortfall` (`src/agents/campaignGeneration/index.ts`) loops regions and, per region, does a `while (shortfall > 0)` loop with sequential `await generateSingleNpc(...)` calls — each one checks the new NPC's name against **all names generated so far in this batch** (`allNames()`) before continuing. Naive `Promise.all` breaks this: two concurrent calls can't see each other's in-flight names and may collide.

Parallelise per region batch (respect rate limits with optional concurrency cap of 3–5), but **generate first, then de-duplicate/regenerate collisions in a second pass** rather than relying on serial-only name checking. Document the collision-handling strategy explicitly in the implementation.

#### Acceptance Criteria

- [x] Shortfall fill issues parallel requests; test mocks confirm concurrent calls
- [x] Name collisions between concurrently-generated NPCs in the same batch are detected and resolved (regenerate or rename), not silently allowed through
- [x] Generation result has the same NPC count per region as serial ordering
- [x] Failed single NPC does not fail entire batch — **note: this is a behavior change, not parity.** Today `fillCampaignNpcShortfall` returns `undefined` on any single failure, discarding the entire repair (only the *initial* generation skips failed slots). State the intended semantics explicitly in the implementation
- [x] Parallelism stays in the pre-persist, in-memory fill only — `persistCampaignNpcsFromGeneration` and `resolveOrRealizeCampaignRace` remain serial (the latter is check-then-insert against `UNIQUE(campaign_id, race_key)` and would throw under concurrent same-race NPCs)

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

- [x] Automated smoke tests assert call-count ceilings per scenario, including both flagged-NPC scenarios (race realized / not yet realized)
- [x] Prompt size regression fixture documents slim context savings (turn context) and identity block savings (guided identity)
- [x] Runbook lists scenarios and expected call budget
- [x] `npm test`, `npm run lint`, `npm run build` pass with epic complete

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

- [x] `flaggedNpc.ts`'s phase-1 (`generateNpcCoreBundle`) and phase-2 (`generateFlaggedNpcDetails`) calls both pass tuned `maxTokens` (coordinated with 040.1)
- [x] Both `flaggedNpc.ts` calls adopt shared `systemPrompt` for their JSON-contract/emphasis boilerplate (coordinated with 040.9)
- [x] Call-count regression test (040.12) asserts exactly 2 calls when the chosen race is already realized in the campaign, and exactly 3 when it is not
- [x] Regression test confirms bulk campaign generation, additional-region generation, and shortfall top-up still issue exactly one LLM call per NPC (no accidental migration to the two-phase pipeline)
- [x] No change to `generateFlaggedNpc`'s output shape or the established-identity-before-flavor-text ordering — this ticket tunes cost, it does not change what gets generated or when
- [x] Documented as intended: a phase-2 failure after a phase-2-triggered race realize leaves the `campaign_races` row in place (benign and idempotent — the next NPC of that race short-circuits the lore call); do not add cleanup

---

### 040.14 Adaptive token ceilings — truncation escalation + knowledge-aware context budgets

#### Description

Follow-up hardening after 040.1/040.4 landed: fixed ceilings must not clip legitimately large content. Three concrete holes:

1. **Truncation is a deterministic dead end.** The 040.1 guard makes the adapters throw (`ClaudeTruncationError` / `Player2TruncationError`) when output hits `maxTokens` — correct for preventing persisted garbage, but the schema-retry loops re-send the identical context, so a legitimately large output (a side-effect-heavy `narrate`, a long NPC speech) fails all attempts with the same cap. Single-shot callers (`narrate`) just fail the turn. Add a provider decorator `withTokenEscalation` that catches truncation and retries the same prompt/systemPrompt with a doubled cap (bounded: max 2 escalations, absolute ceiling, never mutating the shared module-level `GenerateContext` constants). Wire it into the production provider composition (`buildAgentProvider` and the campaign-create provider path). Tiny intentional caps (≤ 8, e.g. connectivity pings) never escalate.
2. **The settings connectivity ping is broken under the guard.** `testPlayer2Connection` pings with `maxTokens: 1`; a real model reply will hit the cap, return `finish_reason: "length"`, and now throw — reporting a healthy endpoint as unreachable. Treat truncation as proof of connectivity (catch it and return ok).
3. **Knowledge-heavy NPCs lose facts/memories to fixed count windows.** 040.4 capped NPC world facts at a fixed 10 most-recent and memories at the recency window (20). For "large" NPCs (long-lived, fact-rich regions) that clips real knowledge even when the individual entries are short. Make both windows budget-aware: guarantee the fixed count minimum, then extend with older entries while a character budget lasts (many short facts → more of them; long facts → no more than today). DM-side event windows stay as-is (each slim event is already truncated to 300 chars, so the DM prompt is bounded).

#### Acceptance Criteria

- [x] Both adapters' truncation errors carry a shared machine-readable marker; `isTruncationError` helper detects them without importing adapter classes
- [x] `withTokenEscalation` retries truncated calls with doubled `maxTokens` (bounded escalations + absolute ceiling), passes the identical prompt and systemPrompt, does not mutate the caller's context object, skips escalation for caps ≤ the ping floor, and rethrows non-truncation errors untouched; fully unit-tested
- [x] Production provider composition applies escalation for agent calls (campaignIpc `buildAgentProvider` + campaign-create provider path); scripted/mock providers in tests are unaffected (no call-count regressions)
- [x] `testPlayer2Connection` treats a truncation error as a successful connectivity check (test covers it)
- [x] `slimWorldFacts` and `slimNpcMemories` accept a budget: fixed-count minimum guaranteed, older entries included while the char budget lasts; unit tests cover many-short-facts (more than 10 included), few-long-facts (no more than the minimum), and empty cases
- [x] NPC context assembly (`npc.ts`) and party-member prior memories use the budget-aware windows
- [x] Band-table doc comment (`providers/types.ts`) and `docs/runbooks/llm-efficiency-smoke-test.md` document the escalation behavior
- [x] `npm test`, `npm run lint`, `npm run build` pass
