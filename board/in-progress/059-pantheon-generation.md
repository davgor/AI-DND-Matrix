# EPIC: Pantheon generation — gods before the world, Pantheon section on review

Campaigns have a world layer (epic **054**: `world_name` / `world_summary` / `world_history`), regions, NPCs, and a story thread — but no gods. Nothing in the setting says who is worshipped, what the faiths demand, or which powers have been lost to time, so temples, priests, oaths, and curses in generated prose are always improvised and never consistent.

This epic adds a **pantheon generation stage at the top of the campaign create pipeline** — gods are generated **first**, straight from the premise, and their context is then **used to generate the world** (and is available to everything downstream, including NPC generation). The pantheon is deliberately **wide-ranging** in the spirit of the heavyweight TTRPG pantheons (Greek, Norse, Forgotten Realms): roughly **8–12 deities** spanning diverse domains (war, death, harvest, sea, knowledge, trickery, hearth, storms…), a mix of major and minor powers, and **at least two "forgotten" gods** — powers lost to time, no longer widely worshipped, remembered only in ruins and old rites.

On the onboarding review screen, a new **Pantheon** section sits **directly under the world overview section**:

- Header: **Pantheon**
- A **summary of the pantheon's premise** — how divinity works in this world, how the faiths relate, what was lost (editable, same `EditableField` pattern as the world summary)
- A **View Pantheon** button opening an overlay modal listing every god: name (+ epithet), a **Forgotten** tag where applicable, their **domains**, their **tenets**, and a short **blurb** about them

New pipeline order:

```
premise_prompt
  → Canon recall (places + characters + knownDeities)  ← moved before pantheon; deities for pantheon
  → Pantheon (prefer knownDeities; invent only to fill) ← NEW
  → World (grounded in premise + pantheon)
  → Regions[] (grounded in world + known places)
    → NPCs per region (grounded in world + region + compact deity context + known characters)
  → storyThread (grounded in world + regions + compact deity context)
```

Broken down into sub-tickets **059.1–059.7**. This epic is done when all are complete and `npm test`, `npm run lint`, and `npm run build` pass. **This epic changes the campaign create pipeline — `docs/runbooks/campaign-create-change-checklist.md` applies to every sub-ticket that touches generation, validation, persistence, or the create UI.**

## Current design (what exists today)

- Staged creation lives in `generateCampaignSeed` (`src/agents/campaignGeneration/index.ts`): `runCampaignSeedAttempt` runs world → regions → per-region NPC slots → story, each via `generateWithRetries` (`MAX_GENERATION_ATTEMPTS` 3 per stage, `MAX_CAMPAIGN_SEED_ATTEMPTS` 5 outer). Prompts in `prompts.ts`, normalize/validate in `normalize.ts`, persistence in `persist.ts` (`persistGeneratedCampaign`), fixtures for tests in `fixtures.ts`.
- Progress stages are `CreateCampaignStage = 'world' | 'regions' | 'npcs' | 'story' | 'persist'` (`src/shared/campaignCreate/types.ts`), with goofy/status copy in `stageMessages.ts`, emitted from `src/main/campaignCreateIpc.ts`.
- Review UI: `CampaignReview.tsx` renders `CampaignReviewWorldSection` (world name heading, `EditableField` summary, **View full history** modal via `CampaignReviewWorldHistoryModal`), then `CampaignReviewStory`, then regions. The hub reuses a read-only world section (`CampaignHubWorldPreview`, 054.6).
- Campaign-scoped lore table precedent: `campaign_races` (`src/db/repositories/campaignRaces.ts`); campaign delete cascade lives in `src/db/repositories/deleteCampaign.ts` (epic **056** added the races cascade).
- Latest schema migration is **v34** (`src/db/schema.ts`); epic 058 is in progress — whichever lands second takes the next free migration version.

## Data model

**New `deities` table** (campaign-scoped, seeded at create, read-only rows in v1):

| Column | Type | Content |
|--------|------|---------|
| `id` | TEXT PK | uuid |
| `campaign_id` | TEXT NOT NULL FK → campaigns | owning campaign |
| `name` | TEXT NOT NULL | e.g. "Vhalor" |
| `epithet` | TEXT NOT NULL | e.g. "the Drowned Judge" (may be empty) |
| `domains` | TEXT NOT NULL | JSON array of short domain strings, e.g. `["death","tides","oaths"]` |
| `tenets` | TEXT NOT NULL | JSON array of 2–4 short imperative tenets |
| `blurb` | TEXT NOT NULL | ~1 short paragraph about the god |
| `is_forgotten` | INTEGER NOT NULL DEFAULT 0 | 1 = lost to time / no longer widely worshipped |
| `sort_order` | INTEGER NOT NULL | stable display order from generation |

**New campaign column**: `pantheon_summary TEXT NOT NULL DEFAULT ''` — the on-screen premise of the pantheon (2–3 paragraphs). Authored at creation, editable on review. Legacy campaigns have `''` + zero deity rows → Pantheon section hidden.

## Core concepts

- **Pantheon first, world second.** The pantheon stage receives only the premise; `buildWorldGenerationPrompt` then receives the pantheon summary + deity roster so the world's history, conflicts, and cultures can be grounded in its gods. Generated **before NPCs** so NPC generation can reference real deities (a priest of an actual god, not an invented one).
- **Known-setting preference (same spirit as epic 070 canon-recall).** When the premise clearly references a known published setting (e.g. Shield Hero, Forgotten Realms), the pantheon stage must **prefer that setting's actual deities / religious powers** over inventing a wholly original pantheon. Extend `CanonRecall` with `knownDeities: string[]` and run the existing **canon** stage **before** pantheon (premise-only — world context optional), so pantheon generation receives known deity names the way regions receive known places. Invent only to fill remaining roster slots / forgotten slots when the setting's divine cast is thin. Original or unrecognized premises keep inventing a full 8–12 roster as today. Do **not** invent fake "canon" god names to pad the recall list.
- **Wide range, mixed prominence.** 8–12 deities, domains must be diverse (no pantheon of five war gods), a mix of major/minor powers, and ≥2 forgotten gods. Forgotten gods are full roster entries — same fields, `is_forgotten = 1` — displayed with a Forgotten tag, not hidden. For known settings, forgotten gods may be obsolete cults, heresies, or powers the setting treats as lost — still ≥2 on the roster.
- **Compact downstream context.** Downstream prompts (single NPC, story thread) get a slim deity digest — name, epithet, domains, forgotten flag — **not** full tenets/blurbs, keeping token cost bounded (epic **040** is actively fighting prompt bloat; don't add a new heavy block to every call).
- **Untrusted content framing.** Premise and all generated pantheon text are passed to later prompts as untrusted narrative content (matching `campaignGeneration/prompts.ts` guardrail language), never as instructions.
- **Review UX mirrors the world section.** Same section shell, `EditableField` on the summary, and the `.campaign-review-overlay` modal pattern from `CampaignReviewWorldHistoryModal` for View Pantheon.

## Target UX (onboarding review)

```
Campaign review
  ┌──────────────────────────────────────────────────────────────┐
  │  <World name>                                                  │
  │  Summary … [View full history]                                 │
  ├──────────────────────────────────────────────────────────────┤
  │  Pantheon                                          ← NEW      │
  │  (editable summary of the pantheon's premise —                 │
  │   how divinity works here, faiths, what was lost)              │
  │                                            [ View Pantheon ]  │
  ├──────────────────────────────────────────────────────────────┤
  │  Main story thread …                                           │
  │  Regions …                                                     │
  └──────────────────────────────────────────────────────────────┘

View Pantheon modal (scrollable list)
  ┌──────────────────────────────────────────────────────────────┐
  │  Pantheon                                            [ × ]    │
  │  ────────────────────────────────────────────────────────    │
  │  Vhalor, the Drowned Judge                                     │
  │  Domains: death · tides · oaths                                │
  │  Tenets:                                                       │
  │   • Keep every oath sworn on water                             │
  │   • Bury nothing the sea can claim                             │
  │  (blurb — a short paragraph about the god)                     │
  │  ────────────────────────────────────────────────────────    │
  │  Sereth, the Hollow Flame                     [ Forgotten ]   │
  │  …                                                             │
  └──────────────────────────────────────────────────────────────┘
```

## Definition of done

- Pantheon (summary + 8–12 deities, diverse domains, ≥2 forgotten) is generated as the **first** pipeline stage from the premise, with per-stage retries and normalize/validate like every other stage
- World generation prompt includes the pantheon; single-NPC and story-thread prompts include the compact deity digest
- Deities + `pantheon_summary` persist in one transaction with the rest of the campaign; campaign delete cascades deity rows
- Create progress surfaces a pantheon stage before world (stage enum + messages)
- Review shows the Pantheon section under the world overview: editable summary + View Pantheon modal listing every god with name/epithet, Forgotten tag, domains, tenets, and blurb; hidden for legacy campaigns
- Hub shows the same section read-only
- Contract test + realistic-drift fixture cover the new stage (per `campaign-create-change-checklist.md`)
- Smoke runbook exists; `npm test`, `npm run lint`, `npm run build` pass

059.1 schema + deities repository · 059.2 pantheon generation agent · 059.3 pipeline insertion + create progress · 059.4 downstream prompt grounding · 059.5 review UI Pantheon section + modal · 059.6 hub read-only pantheon · 059.7 contract fixtures + smoke runbook

## Out of scope

- Editing, adding, or regenerating individual gods on review (summary text is the only editable surface in v1)
- Any mechanical effects — no cleric domain mechanics, blessings, curses, favor tracking, or engine changes
- DM play-time narration grounding (threading the pantheon into `assembleNarrationContext` / turn prompts) — deliberate follow-up so epic **040**'s token-budget work isn't undermined; the world summary already carries divine flavor into play
- Player character religion selection (a "patron deity" onboarding step is a candidate future epic)
- NPC schema changes (no `deity_id` on NPCs — NPC prompts merely *see* the deity digest)
- Backfilling pantheons onto existing campaigns

## Sub-tickets

### 059.1 Schema: `deities` table + `pantheon_summary` + repository

Depends on: none

#### Description
New migration (next free version in `src/db/schema.ts` — coordinate with epic 058) creating the `deities` table per the data-model table above and adding `pantheon_summary` to `campaigns` via `addColumnIfMissing`. New repository `src/db/repositories/deities.ts` mirroring `campaignRaces.ts` (create, list-by-campaign ordered by `sort_order`, JSON (de)serialization of `domains`/`tenets`). Extend the campaign delete cascade and `CampaignDetail`.

#### Acceptance Criteria
- [x] Migration adds `deities` (all columns above, FK to campaigns) and `campaigns.pantheon_summary TEXT NOT NULL DEFAULT ''`; `schema.test.ts` covers it
- [x] `Deity` type + `createDeity` / `listDeitiesByCampaign` repository functions with `domains`/`tenets` round-tripping as `string[]`; unit tests cover round-trip and ordering by `sort_order`
- [x] `Campaign` repository reads/writes `pantheonSummary`; `createCampaign` accepts it (default `''`); `updateCampaignPantheonSummary` helper mirrors `updateCampaignWorldSummary`
- [x] `deleteCampaign` cascade removes deity rows (extend `src/db/repositories/deleteCampaign.ts` + its test, per the 056 races pattern)
- [x] `CampaignDetail` (`src/main/campaignIpc.ts`) includes `deities: Deity[]`

### 059.2 Pantheon generation agent (+ known-deity canon)

Depends on: none (extends 070 canon types/prompts in the same PR)

#### Description
New pipeline stage in `src/agents/campaignGeneration/`: `buildPantheonGenerationPrompt(premisePrompt, canon?)` in `prompts.ts`, `GeneratedPantheon` / `GeneratedDeity` types in `types.ts`, `normalizeGeneratedPantheon` / `isValidGeneratedPantheon` in `normalize.ts`, and `generateCampaignPantheon(provider, premisePrompt, canon?)` in `index.ts` using the existing `generateWithRetries` harness. Output schema: `{ pantheonSummary, deities: [{ name, epithet, domains[], tenets[], blurb, isForgotten }] }`.

Also extend **070 canon-recall** so pantheon can prefer setting gods: add `knownDeities: string[]` to `CanonRecall` / normalize / prompt JSON / fixtures; update `buildCanonRecallPrompt` to be **premise-primary** (world context optional) so canon can run before pantheon/world; instruct preferring listed deity names exactly when generating the pantheon roster.

#### Acceptance Criteria
- [x] Prompt asks for a wide-ranging pantheon: 8–12 deities, diverse domains across the roster, a mix of major and minor powers, **at least 2** with `isForgotten: true`, each deity with 2–4 short tenets and a ~1-paragraph blurb, plus a 2–3 paragraph pantheon summary; premise framed as untrusted narrative content
- [x] When `canon.knownDeities` is non-empty (or recognized setting), prompt instructs preferring those exact deity/religion names before inventing fillers; empty canon → invent freely (original worlds)
- [x] `CanonRecall` includes `knownDeities`; normalize accepts `known_deities` / `deities`; canon prompt + fixtures + unit tests cover the field; empty when unrecognized
- [x] `normalizeGeneratedPantheon` tolerates realistic model drift: snake_case keys (`pantheon_summary`, `is_forgotten`), markdown JSON fences, string booleans ("true"/"yes"), domains/tenets as comma-joined strings, missing epithet → `''`
- [x] `isValidGeneratedPantheon` enforces: 8–12 deities, unique names (case/whitespace-insensitive), every deity has non-empty name/blurb, ≥1 domain, ≥2 tenets, ≥2 forgotten deities, non-empty summary
- [x] `generateCampaignPantheon` retries invalid output up to `MAX_GENERATION_ATTEMPTS` and throws `CampaignGenerationSchemaError` after exhaustion
- [x] TDD-first unit tests with `createScriptedProvider`: valid payload, each drift shape, each validation failure, retry exhaustion; fandom-shaped premise + scripted knownDeities yields those names in the pantheon roster

### 059.3 Pipeline insertion + create progress

Depends on: 059.1, 059.2

#### Description
Insert pantheon after canon and before world in `runCampaignSeedAttempt`, extend `CampaignGenerationResult` with `pantheon: GeneratedPantheon`, ground world generation in it, persist it, and surface the new create-progress stage. Reorder stages to **canon → pantheon → world → regions → npcs → story → persist** so known deities seed the pantheon. Update the legacy `generateAndPersistCampaign` path (`campaigns:generate`) identically.

#### Acceptance Criteria
- [x] `runCampaignSeedAttempt` runs canon → pantheon → world → regions → NPCs → story; `CampaignGenerationResult` includes `pantheon`; canon no longer requires a prior world (premise-only recall)
- [x] Pantheon generation receives the canon recall (including `knownDeities`); unit test: Shield Hero–shaped premise + scripted knownDeities appear as pantheon deity names
- [x] `buildWorldGenerationPrompt` receives the pantheon summary + full deity roster (untrusted framing) and instructs the world's history/cultures/conflicts to be consistent with its gods; unit test asserts deity names appear in the assembled world prompt
- [x] `persistGeneratedCampaign` writes `pantheon_summary` and creates deity rows (with `sort_order` from generation order) in the same transaction as the rest of the campaign
- [x] `CreateCampaignStage` gains `'pantheon'` ordered after `'canon'` and before `'world'`; `stageMessages.ts` gets goofy messages, player message (e.g. "Assembling the pantheon"), and trace label; `mapCreateStageToPlayerMessage` / `buildCreateProgress` tests updated
- [x] `createCampaignFromRequest` emits the pantheon stage; existing scripted-provider integration tests updated with a pantheon response in every queue (after canon)
- [x] `regionCount === 0` campaigns still generate and persist a pantheon

### 059.4 Downstream prompt grounding (NPCs + story)

Depends on: 059.2

#### Description
Give post-world generation stages a **compact deity digest** — one line per god: name, epithet, domains, `(forgotten)` marker — via a `formatDeityDigest(deities)` helper in `prompts.ts`. Thread it into `buildSingleNpcPrompt` (initial slots, shortfall fill, and the flagged review-time path in `flaggedNpcPrompts.ts`) and `buildStoryThreadGenerationPrompt`. No full tenets/blurbs downstream (token budget, epic 040).

#### Acceptance Criteria
- [x] `formatDeityDigest` renders one compact line per deity including the forgotten marker; unit tested
- [x] `buildSingleNpcPrompt` and `buildStoryThreadGenerationPrompt` include the digest when deities exist, instructing that any religious references use these gods rather than inventing new ones; omitted cleanly when empty (legacy campaigns)
- [x] Flagged NPC generation (`flaggedNpc.ts` / `flaggedNpcPrompts.ts`) and additional-region NPC generation load campaign deities and pass the digest
- [x] Prompt unit tests assert digest lines present in NPC/story prompts and absent for deity-less campaigns; digest contains no tenets/blurb text

### 059.5 Review UI: Pantheon section + View Pantheon modal

Depends on: 059.1, 059.3

#### Description
New `CampaignReviewPantheonSection.tsx` rendered in `CampaignReview.tsx` directly below `CampaignReviewWorldSection` (above `CampaignReviewStory`): header **Pantheon**, `EditableField` on the summary, **View Pantheon** button opening `CampaignReviewPantheonModal.tsx` (reuse the `.campaign-review-overlay` shell from `CampaignReviewWorldHistoryModal`). New edit IPC `campaigns:editPantheonSummary` in `src/main/campaignEditIpc.ts` following `editWorldSummary`.

#### Acceptance Criteria
- [x] Pantheon section renders between world section and story thread, header text **Pantheon**, summary editable and saved via `campaigns:editPantheonSummary` → refreshed `CampaignDetail`
- [x] **View Pantheon** opens a scrollable modal listing every deity in `sort_order`: name + epithet, **Forgotten** tag when `is_forgotten`, domains, tenets as a bulleted list, and the blurb (read-only)
- [x] Section hidden when `pantheonSummary` is empty and the campaign has no deities (legacy campaigns)
- [x] Preload + `window.d.ts` expose the edit handler; IPC unit test covers save + refresh
- [x] Component tests cover: section render, summary save callback, modal open/close, forgotten tag shown only for forgotten gods, hidden-when-legacy

### 059.6 Hub read-only pantheon section

Depends on: 059.5

#### Description
Mirror 054.6: show the Pantheon section (summary + View Pantheon modal, all read-only, no edit IPC) in `CampaignHubWorldPreview`, reusing the presentational pieces from 059.5.

#### Acceptance Criteria
- [x] Hub world preview shows the pantheon summary under the world section when present; View Pantheon opens the same modal read-only (no `EditableField`, no save)
- [x] Hub snapshot exposes deities (extend `buildHubSnapshot` or reuse `CampaignDetail` fields); test updated
- [x] Legacy campaigns hide the section in the hub too

### 059.7 Contract fixtures + smoke runbook

Depends on: 059.1–059.6

#### Description
Close out the campaign-create change checklist: realistic-drift fixture, contract case, and a manual smoke runbook.

#### Acceptance Criteria
- [x] `fixtures.ts` gains a realistic pantheon response (snake_case keys, JSON fences, string booleans, comma-joined domains) at the head of the cascading fixture queues; `buildRealisticLlmCascadingSeedResponses` / `buildCrimsonReachCascadingResponses` updated
- [x] `campaignCreateIpc.contract.test.ts` covers create with the pantheon stage (default 2 regions / 3 NPCs): deities persisted, summary non-empty, ≥2 forgotten, world prompt received deity names
- [x] `docs/runbooks/pantheon-smoke-test.md`: create with a real provider → progress shows the pantheon stage → review shows Pantheon under world overview → View Pantheon lists 8–12 gods with domains/tenets/blurbs and ≥2 Forgotten tags → edit summary persists across reload → hub shows it read-only; lists the vitest commands from the create checklist
- [ ] One manual create with a real provider completed and documented in the runbook's verification section
- [x] `npm test`, `npm run lint`, `npm run build` pass
