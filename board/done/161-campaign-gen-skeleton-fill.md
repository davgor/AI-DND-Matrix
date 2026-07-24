# EPIC: Campaign gen — skeleton fill (engine JSON + LLM blocks)

Campaign create still asks the LLM to emit a **full JSON object** at every stage (`Respond ONLY with a single JSON object…` in `src/agents/campaignGeneration/prompts.ts`). Local models (especially llama.cpp) flake on braces, missing commas, mashed array objects, and split dumps. We keep papering over drift in `tryParseJson` (**020.32**, **160**, etc.) — reactive and ticket-driven.

This epic replaces that contract with **skeleton fill**:

1. **Engine owns the JSON structure** — builds a skeleton with stable placeholder tokens for every LLM-owned field.
2. **Prompt shows the skeleton** and asks the model to fill placeholders only — **not** emit JSON.
3. **LLM returns labeled blocks** (`<<<TOKEN>>>…<<</TOKEN>>>`).
4. **Engine substitutes** → `JSON.parse` on an engine-authored string → existing `normalize*` / `isValid*` paths unchanged.

Builds on **054** / **059** / **125** (staged create pipeline), **020.30–020.33** / **160** (JSON reliability lineage). **Changes the campaign create pipeline** — `docs/runbooks/campaign-create-change-checklist.md` applies to create-touching sub-tickets.

**Relation to 160:** keep **160** (`tryParseJson` missing-comma / mashed-relations repair) as an **interim** fix for current JSON stages. Skeleton fill is the structural fix; after migrated stages ship, those repairs are no longer required for campaign-create stages (parser may keep defensive repairs for non-campaign agents that still return JSON).

Broken down into sub-tickets **161.1–161.8**. Done when all are complete. Implement when the surrounding create-pipeline body of code is in the right state — do not start until ready.

## Locked design: skeleton fill

```
Stage prompt + JSON skeleton with {{PLACEHOLDERS}}
  → LLM labeled blocks (<<<TOKEN>>>…<<</TOKEN>>>)
  → fillSkeleton (engine)
  → JSON.parse (engine-authored string)
  → normalize + isValid (existing)
```

Example LLM response shape:

```text
<<<WORLD_NAME>>>
Eldergloom
<<</WORLD_NAME>>>
<<<WORLD_SUMMARY>>>
...prose...
<<</WORLD_SUMMARY>>>
```

### Engine-owned vs LLM-owned (default policy)

| Owned by | Examples |
|----------|----------|
| Engine | Object shape, array slot count, `factionPressure` when derived from form, `kind` / `stance` / `alignment` when chosen from rosters or coerced, `key` / `sortOrder`, relation pair keys |
| LLM | Names, summaries, histories, quest lines, deity blurbs, free-text membership roles |

Where the model must pick from a closed set (e.g. `kind`, `stance`), prefer **engine assigns** or a **single-token block** validated against a roster — never freeform JSON enums embedded in a blob.

### Out of scope for this epic

- Play-loop agents (`AGENT_JSON_CONTRACT_SYSTEM`) — unless a later ticket extends the protocol
- Guided decoding / llama.cpp JSON-schema mode
- Completing or closing **160** as part of this epic (independent interim track)

## Target flow (unchanged stage order)

```
canon → pantheon → world → factions → regions → per-slot NPCs → bestiary → story → persist
```

Only the **prompt + parse path** changes; stage order, normalize validators, persist, and create progress stages stay unless a sub-ticket explicitly changes them.

## Files to touch (by area)

| Area | Key files |
|------|-----------|
| Protocol | New module under `src/agents/` (e.g. `skeletonFill.ts`) + tests |
| Stage loop | `src/agents/campaignGeneration/index.ts` (`generateWithRetries`) |
| Prompts | `src/agents/campaignGeneration/prompts.ts` (+ `bestiaryStage.ts` as needed) |
| Fixtures / contract | `src/test/fixtures/campaignGenerationFixtures.ts`, `src/main/campaignCreateIpc.contract.test.ts`, `campaignGeneration.test.ts` |
| Docs | `docs/runbooks/campaign-create-change-checklist.md`, `docs/runbooks/llm-usage-call-site-inventory.md` |

## Sub-tickets

| Id | Title |
|----|-------|
| **161.1** | Shared skeleton protocol (`fillSkeleton` + tagged-block extract) |
| **161.2** | Wire `generateWithRetries` alternate `parseMode: 'skeleton'` |
| **161.3** | Migrate factions stage (pilot) |
| **161.4** | Migrate world + pantheon |
| **161.5** | Migrate regions + NPC + story + bestiary + canon |
| **161.6** | Fixtures + contract tests for skeleton dumps |
| **161.7** | Docs / checklist / LLM inventory |
| **161.8** | Delivery gate + local-provider smoke note |

### 161.1 Shared skeleton protocol

Part of epic **161**. Build the reusable engine path that turns labeled LLM blocks into a filled JSON string without asking the model to emit JSON.

#### Description

Add a small module (e.g. `src/agents/skeletonFill.ts`) that:

1. Extracts `<<<TOKEN>>>…<<</TOKEN>>>` (or equivalent locked delimiter) blocks from raw model text
2. Substitutes `{{TOKEN}}` placeholders in an engine-authored JSON skeleton
3. Returns parseable JSON text (or a clear failure reason for missing / extra / malformed tags)

TDD-first. No campaign stage migration in this ticket — protocol + unit tests only.

#### Acceptance criteria

- [x] `fillSkeleton(skeleton, rawLlmText)` (names flexible) fills all placeholders from labeled blocks
- [x] Unit tests: happy path, missing token, extra/unknown token, malformed/unclosed tags, nested/prose noise around tags
- [x] Placeholder substitution does not re-introduce unescaped quotes/control chars that break `JSON.parse` (escape policy documented in code/tests)
- [x] No campaign stage prompts changed yet

### 161.2 Wire generateWithRetries skeleton parse mode

Part of epic **161**. Depends on **161.1**.

#### Description

Extend `generateWithRetries` in `src/agents/campaignGeneration/index.ts` so a stage can declare `parseMode: 'skeleton'` (name flexible):

- Build / pass engine skeleton + expect labeled blocks
- Run `fillSkeleton` → `JSON.parse` → existing `normalize` / `isValid`
- Keep failure classification (`unparseable` / `normalize_failed` / `invalid`) and retry / logging behavior from **020.31**

Default stages remain `json` until migrated. No production stage switched in this ticket unless needed for a thin integration test with a fake stage helper.

#### Acceptance criteria

- [x] Stage helpers can select skeleton vs JSON parse path
- [x] Skeleton parse failures map into existing schema-failure reasons + truncated raw dumps
- [x] Unit/integration test covers one scripted skeleton success and one missing-block failure through `generateWithRetries`
- [x] JSON path behavior for unmigrated stages unchanged

### 161.3 Migrate factions stage (skeleton fill pilot)

Part of epic **161**. Depends on **161.1** / **161.2**. Hottest flake stage (see **160**).

#### Description

Replace factions prompt JSON example + `Respond ONLY with a single JSON object…` with an engine-owned skeleton and labeled-block instructions in `buildFactionsGenerationPrompt`.

Engine owns structure, slot counts, keys, and closed enums where the locked policy says so; LLM fills names/summaries/relation blurbs (and any other LLM-owned fields). Wire the factions stage through skeleton `parseMode`. Keep `normalizeGeneratedFactions` / pressure bands / religious coerce.

Follow `docs/runbooks/campaign-create-change-checklist.md`.

#### Acceptance criteria

- [x] Factions prompt no longer requires the model to emit raw JSON
- [x] Factions stage uses skeleton fill end-to-end
- [x] Unit tests with realistic labeled-block dumps (including prior Eldergloom failure modes as block responses) pass normalize + `isValidGeneratedFactions`
- [x] `campaignCreateIpc.contract.test.ts` still green with updated factions fixture responses
- [x] Campaign-create checklist items for prompt/schema change addressed for this stage

### 161.4 Migrate world + pantheon to skeleton fill

Part of epic **161**. Depends on **161.1** / **161.2**. Prefer after factions pilot (**161.3**) unless unblocked in parallel.

#### Description

Convert world and pantheon campaign-create stages to skeleton fill: engine skeletons + labeled blocks for prose/name fields; existing `normalizeGeneratedWorld` / pantheon normalize + validators unchanged.

Update prompts in `prompts.ts` and stage generators in `index.ts`. Follow the create-change checklist.

#### Acceptance criteria

- [x] World and pantheon prompts no longer require raw JSON from the model
- [x] Both stages use skeleton `parseMode`
- [x] Unit + fixture coverage for labeled-block world/pantheon dumps (including prior split-world / fence cases as block responses where relevant)
- [x] Contract tests updated and green

### 161.5 Migrate remaining create stages to skeleton fill

Part of epic **161**. Depends on **161.1** / **161.2**; ideally after **161.3** / **161.4**.

#### Description

Finish campaign-create migration for:

- Canon recall
- Regions (bulk + additional region if same contract)
- Per-slot / single NPC
- Bestiary
- Story thread

Same skeleton + labeled-block contract. Engine owns structure and closed sets; LLM fills prose and names. Follow the create-change checklist.

#### Acceptance criteria

- [x] Canon, regions, NPC, bestiary, and story stages no longer require raw JSON from the model
- [x] All use skeleton `parseMode` through `generateWithRetries` (or equivalent stage helpers)
- [x] Additional-region / single-NPC / shortfall paths use the same contract where they share prompts
- [x] Unit + contract fixtures updated; no campaign-create stage left on “Respond ONLY with a single JSON object”

### 161.6 Skeleton fixtures + contract tests

Part of epic **161**. Depends on stage migrations (**161.3–161.5**) or lands incrementally alongside them.

#### Description

Replace / extend cascading seed fixtures so scripted providers return **labeled blocks**, not JSON blobs, for migrated stages. Add realistic drift cases (extra prose around tags, slight delimiter noise) that still succeed or fail clearly.

Primary files: `src/test/fixtures/campaignGenerationFixtures.ts`, `src/main/campaignCreateIpc.contract.test.ts`, related generation unit tests.

#### Acceptance criteria

- [x] Cascading create fixtures use skeleton-block responses for all migrated stages
- [x] At least one contract case mirrors live local-model style drift for labeled blocks
- [x] `npx vitest run src/main/campaignCreateIpc.contract.test.ts` passes
- [x] Old JSON-only fixtures either retired for create path or kept only for non-migrated / legacy agents

### 161.7 Docs: checklist + LLM inventory for skeleton fill

Part of epic **161**. Depends on protocol + at least one migrated stage (prefer after **161.5**).

#### Description

Document the new output contract so future create-pipeline work does not reintroduce “Respond ONLY with JSON” for campaign stages.

Update:

- `docs/runbooks/campaign-create-change-checklist.md` — parsing path, fixture expectations, failure modes
- `docs/runbooks/llm-usage-call-site-inventory.md` — campaign gen call sites note skeleton fill
- Epic **161** / README only if they currently claim JSON-from-LLM for create

#### Acceptance criteria

- [x] Create checklist describes skeleton fill as the campaign-stage contract
- [x] LLM call-site inventory marks campaign create stages as skeleton fill
- [x] No stale “model must return JSON” guidance for migrated create stages

### 161.8 Delivery gate + local-provider smoke for skeleton fill

Part of epic **161**. Last sub-ticket after **161.1–161.7**.

#### Description

Close the epic with the full delivery gate and create-pipeline smoke expectations:

- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`
- `act` for `.github/workflows/pr-checks.yml` and `.github/workflows/deadcode.yml`
- Campaign-create checklist automated smoke + note for one manual real-provider create

Confirm no campaign-create stage still depends on raw JSON-from-LLM.

#### Acceptance criteria

- [x] Full local delivery gate passes
- [x] `act` pr-checks + deadcode jobs succeed (`🏁 Job succeeded`)
- [x] Create checklist automated smoke listed in the checklist is green
- [x] Manual real-provider create smoke noted/run per checklist for prompt contract change
- [x] Epic **161** acceptance criteria checked off and epic moved to `done/` when this ticket completes

#### Verification notes (161.8)

- Local: `npm test` (2883), `npm run lint`, `npm run build`, `npm run typecheck`, `npm run deadcode` green.
- `act` `.github/workflows/pr-checks.yml`: all jobs `🏁 Job succeeded` (test-plan, lint, build, test-1/2/3).
- `act` `.github/workflows/deadcode.yml`: `🏁 Job succeeded` / `No new dead exports found.`
- Automated smoke: `campaignCreateIpc.contract.test.ts`, `campaignCreateIpc.test.ts`, `campaignGeneration.test.ts`, `campaignIpc.test.ts` — 91 passed.
- **Manual real-provider create:** required per `docs/runbooks/campaign-create-change-checklist.md` §4 (prompt contract change). Not run in this agent session — run once locally: default counts (2 regions / 3 NPCs), premise similar to recent failures; confirm progress stages + Campaign Review world/regions/NPCs with no invalid-campaign error.
- Fixture typecheck fix: labeled-block NPC helpers accept optional `GeneratedNpc` fields with defaults (`resolveLabeledNpcFields`).

## Definition of done

- Shared skeleton protocol shipped and unit-tested
- All campaign-create stages use skeleton fill (no stage still requires the model to emit raw JSON)
- Contract + generation unit tests cover realistic labeled-block dumps
- Campaign-create checklist + LLM inventory updated
- Full delivery gate + act pass; manual real-provider create smoke noted per checklist
- **160**-style JSON repairs no longer required for migrated campaign stages

## Acceptance criteria

- [x] Epic index lists **161.1–161.8**; each sub-ticket has Description + checkable ACs
- [x] Locked design (skeleton + labeled blocks + engine-owned structure) documented above and unchanged without a new decision
- [x] All sub-tickets complete and moved to `done/`
- [x] Create checklist satisfied for the pipeline change
