# EPIC: Campaign world generation — cascading context & review UI

## Current design (what exists today)

Initial campaign creation (`campaigns:create` → `createCampaignFromRequest` in `src/main/campaignCreateIpc.ts`) calls **`generateCampaignSeed`** (`src/agents/campaignGeneration/index.ts`), which issues **one** LLM request via **`buildGenerationPrompt`** (`src/agents/campaignGeneration/prompts.ts`) and expects a single JSON payload: `regions[]`, `npcs[]`, `storyThread`. Normalization/validation lives in **`normalizeCampaignGeneration`** / **`isValidGenerationResult`** (`src/agents/campaignGeneration/normalize.ts`). Persistence is **`persistGeneratedCampaign`** (`src/agents/campaignGeneration/persist.ts`): `createCampaign` → regions + `region_history` (in_game_date 0 backstory, 1 recent) + quest_hook `world_facts` → NPCs (with `resolveOrRealizeCampaignRace`) → story thread + quest seeding.

There is **no campaign-level world layer**. The closest fields:

| Field | Table | Role today |
|-------|-------|------------|
| `campaigns.name` | `campaigns` | Save/display name from setup form (or premise slice) — **not** a setting name |
| `campaigns.premise_prompt` | `campaigns` | Player's creation prompt; threaded into all generation |
| `campaigns.current_state_summary` | `campaigns` | **Live play-state** updated during narration (`updateCampaignStateSummary` in `src/db/repositories/campaigns.ts`, DM side effects in `src/agents/dm.ts`) — empty at onboarding |

Onboarding review (`src/renderer/src/campaignReview/CampaignReview.tsx`) shows **Main Story Thread** then **Regions**. Region **overview** is editable via **`EditableField`** + `window.campaigns.editRegionDescription` (`src/main/campaignEditIpc.ts` → `updateRegionDescription`). Region **history / recent / quest hooks** are **read-only** via **`CampaignReviewRegionExtras`** + `RegionExtras` (`src/shared/campaign/regionExtras.ts`, assembled in `buildRegionExtras` in `src/main/campaignIpc.ts`). Hub reuses **`CampaignReviewReadOnlyRegionCard`** in **`CampaignHubWorldPreview`** (`src/renderer/src/campaignHub/CampaignHubWorldPreview.tsx`) — read-only per epic **038**.

Post-create generation already threads **campaign history** into additional regions: **`assembleCampaignHistoryContext`** (`src/agents/campaignGeneration/prompts.ts`) feeds **`buildAdditionalRegionPrompt`**. Flagged NPC generation (**052**) is a **separate two-phase path** (`generateFlaggedNpc` in `src/agents/campaignGeneration/flaggedNpc.ts`) used only from review/hub **Generate NPC** — not from initial bulk create. NPC shortfall repair already loops **`generateSingleNpc`** per missing slot (`fillCampaignNpcShortfall` in `index.ts`).

Downstream agents today read **`campaign.currentStateSummary`** for “world context” at onboarding — e.g. `generateBackgroundStoryForCharacter` passes `worldSummary: campaign.currentStateSummary` (`src/main/backgroundIpc.ts` line 54), `resolveOrRealizeCampaignRace` uses it in `buildRaceLorePrompt` (`src/agents/raceLore.ts`). At fresh create this is always empty.

Latest schema migration is **v33** (`src/db/schema.ts`); column adds use **`addColumnIfMissing`**.

---

## What this epic adds

A **top-down generation pipeline** where context flows downward:

```
premise_prompt
  → World (world_name + world_summary + world_history)
  → Regions[] (grounded in world; same GeneratedRegion shape)
  → NPCs per region (grounded in world + region; same GeneratedNpc shape + existing validators)
  → storyThread (grounded in world + regions)
```

**New campaign columns** (migration **v34**, `TEXT NOT NULL DEFAULT ''`):

| Column | TS field on `Campaign` | Content |
|--------|------------------------|---------|
| `world_name` | `worldName` | Distinct setting name |
| `world_summary` | `worldSummary` | Exactly **3 paragraphs** — on-screen preview |
| `world_history` | `worldHistory` | **One-pager** (~4–6 paragraphs) — deeper history |

**Authority boundary:** `world_*` fields are **authored at creation**, editable on onboarding review. **`current_state_summary` is unchanged** — live narration state only; do not initialize it from world fields or conflate the two in play-time updates.

**Review UX** (onboarding `CampaignReview` only — hub stays read-only per **038**):

- New **World** section **above** `CampaignReviewStory`, below `CampaignReviewHeader`
- Shows `worldName` as heading + `worldSummary` via **`FormattedText`** / **`EditableField`** (same save pattern as region overview)
- **View** button opens overlay modal (reuse `.campaign-review-overlay` + `.campaign-review-generate-modal` shell from `campaignReview.css`) showing `worldHistory`; modal body is **`EditableField`** or textarea + Save → new IPC handler returning refreshed `CampaignDetail`
- Legacy campaigns (empty `world_name` + `world_summary`) **hide the section**

**Hub UX:** `CampaignHubWorldPreview` shows world summary + View modal (**read-only** history body, no edit IPC from hub).

---

## Target flow (initial create — replaces monolithic `buildGenerationPrompt`)

Orchestration stays in **`generateCampaignSeed`** (or decomposed helpers exported from `index.ts`). Retain **`MAX_GENERATION_ATTEMPTS`** (3) **per stage**. Suggested token budgets follow existing constants (`GENERATION_MAX_TOKENS` 10240, `SINGLE_NPC_MAX_TOKENS` 4096).

| Stage | New prompt builder | Output schema | Notes |
|-------|-------------------|---------------|-------|
| 1 World | `buildWorldGenerationPrompt` | `{ worldName, worldSummary, worldHistory }` | `normalizeGeneratedWorld` + `isValidGeneratedWorld` |
| 2 Regions | `buildRegionsGenerationPrompt` | `{ regions: GeneratedRegion[] }` | Reuse region normalize validators; `regionCount` from `resolveInitialGenerationCounts` |
| 3 NPCs | Extend `buildSingleNpcPrompt` + loop `generateSingleNpc` **per region** | `{ npc: GeneratedNpc }` each | Pass world + region description/history; reuse `fillCampaignNpcShortfall` pattern for count enforcement |
| 4 Story | `buildStoryThreadGenerationPrompt` | `{ storyThread: GeneratedStoryThread }` | Reuse existing story-thread normalize |

Extend **`CampaignGenerationResult`** (`types.ts`) with `world: GeneratedWorld`. **`persistGeneratedCampaign`** writes world fields on `createCampaign` (extend `CreateCampaignInput` / INSERT).

**Do not** route initial bulk NPCs through **`generateFlaggedNpc`** (review-only two-phase path). **Do** extend flagged/additional-region/single-NPC prompts in **054.7** so post-create flows see world context.

Progress (`src/shared/campaignCreate/types.ts` + `campaignCreateIpc.ts`): either add stages to `CREATE_CAMPAIGN_STAGE_ORDER` or keep 3 buckets with richer `statusText` per sub-stage (world → regions → NPCs → story → persist). Update **`mapCreateStageToPlayerMessage`** if stage enum changes.

Also update legacy **`generateAndPersistCampaign`** / `campaigns:generate` (`src/main/campaignIpc.ts`) — same pipeline.

---

## Files to touch (by sub-ticket)

### 054.1 Shared types + DB schema

- `src/db/schema.ts` — migration **v34**: `addColumnIfMissing` on `campaigns` for `world_name`, `world_summary`, `world_history`
- `src/db/repositories/campaigns.ts` — `Campaign`, `CampaignRow`, `rowToCampaign`, `createCampaign` input/INSERT, `updateCampaignWorldSummary`, `updateCampaignWorldHistory` (mirror `updateCampaignStateSummary` / `updateRegionDescription` style)
- `src/db/repositories/campaigns.test.ts` — round-trip + migration
- `src/main/campaignIpc.ts` — `CampaignDetail` unchanged shape (world fields live on `campaign`)
- `src/preload/index.ts`, `src/renderer/src/window.d.ts` — expose edit handlers

### 054.2 World generation agent

- `src/agents/campaignGeneration/types.ts` — `GeneratedWorld`, validators
- `src/agents/campaignGeneration/prompts.ts` — `buildWorldGenerationPrompt`, prose constants (3 summary paragraphs, 4–6 history paragraphs)
- `src/agents/campaignGeneration/normalize.ts` — `normalizeGeneratedWorld`, `isValidGeneratedWorld`
- `src/agents/campaignGeneration/worldGeneration.test.ts` (or section in `campaignGeneration.test.ts`) — mock provider valid/invalid JSON

### 054.3 Cascading region + NPC + story generation

- `src/agents/campaignGeneration/prompts.ts` — `buildRegionsGenerationPrompt`, `buildStoryThreadGenerationPrompt`; extend `buildSingleNpcPrompt` with `worldContext` param
- `src/agents/campaignGeneration/index.ts` — refactor `generateCampaignSeed` to staged orchestration; keep `fillCampaignNpcShortfall` / `needsNpcTopUp` behavior
- `src/agents/campaignGeneration/normalize.ts` — region/story normalize from partial payloads
- `src/agents/campaignGeneration/fixtures.ts` — staged mock responses for tests
- `src/agents/campaignGeneration/campaignGeneration.test.ts` — assert prompt lines include upstream world text; full staged mock → valid `CampaignGenerationResult`

### 054.4 Persistence + create progress

- `src/agents/campaignGeneration/persist.ts` — pass world fields into `createCampaign`
- `src/main/campaignCreateIpc.ts` — emit progress per stage
- `src/shared/campaignCreate/types.ts`, `stageMessages.ts` — stage enum/messages if extended
- `src/main/campaignCreateIpc.test.ts` — integration with scripted multi-response provider

### 054.5 Onboarding review UI

- `src/renderer/src/campaignReview/CampaignReview.tsx` — wire world section + modal state
- New `CampaignReviewWorldSection.tsx` (summary `EditableField`, View button)
- New `CampaignReviewWorldHistoryModal.tsx` (overlay + editable history + save)
- `src/renderer/src/campaignReview/CampaignReviewLayout.tsx` — optional header lead copy update
- `src/main/campaignEditIpc.ts` — `editWorldSummary`, `editWorldHistory` (+ `registerCampaignEditHandlers`)
- `src/renderer/src/campaignReview/campaignReview.css` — minimal styles if needed
- Component tests (e.g. `CampaignReviewWorldSection.test.tsx`)

### 054.6 Hub read-only world section

- `src/renderer/src/campaignHub/CampaignHubWorldPreview.tsx` — world section when `campaign.worldSummary` non-empty; read-only `FormattedText`; View modal read-only
- Shared presentational `CampaignReviewWorldContent` (hub wires modal state in `CampaignHub`)
- `src/main/campaignHubIpc.test.ts` — snapshot includes world fields via `campaign` object (no `PlayAwareHubSnapshot` shape change required)

### 054.7 Downstream prompt grounding

- `src/agents/campaignGeneration/types.ts` — extend `CampaignHistoryContext` with `worldName`, `worldSummary`, `worldHistory`
- `src/agents/campaignGeneration/prompts.ts` — `assembleCampaignHistoryContext` + `formatCampaignHistoryLines`; `buildAdditionalRegionPrompt`, `buildSingleNpcPrompt`
- `src/agents/campaignGeneration/flaggedNpcPrompts.ts` — thread world into flagged NPC final prompt (load campaign in `generateFlaggedNpc`)
- `src/main/backgroundIpc.ts` — `worldSummary: campaign.worldSummary || campaign.currentStateSummary`
- `src/agents/raceLore.ts` — same fallback when realizing race lore
- Unit tests on built prompt strings

### 054.8 Smoke runbook

- `docs/runbooks/campaign-world-generation-smoke-test.md` — create → review summary → View/edit history → verify regions feel grounded; list vitest paths

---

## Sub-tickets

### 054.1 Shared types + DB schema

#### Acceptance criteria

- [x] Migration v34 adds `world_name`, `world_summary`, `world_history` to `campaigns` via `addColumnIfMissing`
- [x] `Campaign` repository reads/writes all three; `createCampaign` accepts optional world fields (default `''`)
- [x] `updateCampaignWorldSummary` / `updateCampaignWorldHistory` repository helpers exist
- [x] `src/db/repositories/campaigns.test.ts` covers migration + round-trip

### 054.2 World generation agent (phase 1)

#### Acceptance criteria

- [x] `generateCampaignWorld(provider, premisePrompt)` returns validated `GeneratedWorld` with retry loop
- [x] Prompt enforces 3 summary paragraphs + one-pager history; constants live beside `REGION_PROSE_RULES` in `prompts.ts`
- [x] Failing-test-first unit coverage with `createScriptedProvider`

### 054.3 Cascading region + NPC + story generation

#### Acceptance criteria

- [x] `generateCampaignSeed` runs world → regions → per-region NPCs → story thread (not monolithic `buildGenerationPrompt`)
- [x] Region/NPC/story outputs pass existing `GeneratedRegion` / `GeneratedNpc` / `GeneratedStoryThread` validators
- [x] `regionCount === 0` still yields empty regions + story thread only
- [x] Tests prove downstream prompts include world name/summary/history text

### 054.4 Persistence + create progress

#### Acceptance criteria

- [x] `persistGeneratedCampaign` persists world fields on campaign row
- [x] `createCampaignFromRequest` progress messages name world/regions/NPCs/story/persist steps
- [x] `generateAndPersistCampaign` uses same pipeline

### 054.5 Onboarding review UI — world section

#### Acceptance criteria

- [x] World section above story thread; `EditableField` on summary; View opens history modal
- [x] Save summary/history via `campaigns:editWorldSummary` / `campaigns:editWorldHistory` → `CampaignDetail` refresh
- [x] Empty world fields hide section (legacy campaigns)
- [x] Component test covers View open and save callback

### 054.6 Hub read-only world section

#### Acceptance criteria

- [x] `CampaignHubWorldPreview` shows world name + summary when present
- [x] View modal shows full history read-only (no edit from hub)
- [x] `buildHubSnapshot` test still passes; world readable from `snapshot.campaign`

### 054.7 Downstream prompt grounding

#### Acceptance criteria

- [x] `CampaignHistoryContext` + `assembleCampaignHistoryContext` include world fields
- [x] Additional-region and single-NPC prompts include world context when non-empty
- [x] Background story + race lore use `worldSummary` with fallback to `currentStateSummary`
- [x] Prompt unit tests assert world lines present

### 054.8 Smoke runbook

#### Acceptance criteria

- [x] Runbook under `docs/runbooks/` with automated vitest command list + manual Campaign Review steps
- [x] Documents expected create-loading status labels

---

## Out of scope / do not change

- **`current_state_summary`** semantics and DM narration updates
- Hub region/NPC **edit** or generate UX (038 contracts)
- Replacing **052** flagged-NPC two-phase flow for review-time Generate NPC
- New tables (`world_facts` stays quest hooks / DM facts only)
- `/engine` imports of LLM or DB

## Verification gate

All sub-tickets done → `npm test`, `npm run lint`, `npm run build`.
