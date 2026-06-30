# EPIC: Configurable generation counts + review/play validation

Let the player choose how much content the initial campaign generation produces — **region count** (0–5, default **2**) and **NPCs per region** (0–10, default **3**) — on the new-campaign setup modal. Thread those counts through the generation agent instead of today's hardcoded 2–4 regions and exactly 3 NPCs per region.

On the onboarding **CampaignReview** screen, tighten validation and add generation affordances:

- **Continue** requires at least **1 region** and **1 NPC** total (campaign-wide).
- **Generate another region** keeps the seed-prompt modal but adds a configurable **NPC count** (0–10) for the new region.
- Each region card gets a **Generate NPC** action that opens a seed-prompt modal (same pattern as region generation) to add NPCs to that region on demand.

Block **play entry** when **any region has zero NPCs** — applies on the path from character creation into `PlayView` and, when **038** lands, hub resume into play as well.

Builds on **007** (campaign generation), **017** (campaign start modal), **009.7** (campaign review). **038.16** should consume the configurable NPC-count region modal from **039.6** once both are done.

Broken down into sub-tickets **039.1–039.9**. This epic is done when all of them are.

Definition of done:
- campaign start modal captures region count (0–5, default 2) and NPCs per region (0–10, default 3)
- initial generation honors requested counts end-to-end (prompt, parse validation, persistence)
- campaign review blocks continue until ≥1 region and ≥1 NPC exist; surfaces clear messaging
- generate-region flow accepts per-request NPC count (0–10)
- each region on review can generate additional NPCs via seed modal
- play cannot start while any region has zero NPCs
- tests cover counts, review gates, NPC/region generation, and play gate

039.1 shared types + validation · 039.2 campaign start modal fields · 039.3 create-campaign IPC wiring · 039.4 initial generation agent parameterization · 039.5 campaign review continue validation · 039.6 generate-region modal NPC count + additional-region pipeline · 039.7 per-region generate NPC modal + pipeline · 039.8 play entry gate (regions must have NPCs) · 039.9 integration tests + smoke coverage

## Sub-tickets

### 039.1 Shared types + validation for generation counts

#### Description
Extend the campaign-create shared contract with two integer generation options:

- **`regionCount`**: 0–5 inclusive, default **2**
- **`npcsPerRegion`**: 0–10 inclusive, default **3**

Add to `CampaignSetupFormValues`, `CreateCampaignRequest`, `DEFAULT_CAMPAIGN_SETUP_FORM`, and validation helpers in `/shared/campaignCreate`. Export named min/max/default constants so agent and UI tickets share one source of truth.

Document that these counts describe the **initial** one-shot generation request; later review-screen generation uses per-action counts (039.6–039.7).

#### Acceptance Criteria
- [x] `regionCount` and `npcsPerRegion` are typed on form + request with documented bounds and defaults
- [x] `validateCampaignSetupForm` rejects out-of-range or non-integer values with actionable messages
- [x] `mapFormToCreateRequest` includes both fields
- [x] `isValidCreateCampaignRequest` accepts omitted fields (defaults apply) and rejects invalid explicit values
- [x] Unit tests cover bounds, defaults, and rejection cases

### 039.2 Campaign start modal: region + NPC count fields

#### Description
Add two controls to the new-campaign setup modal (`CampaignStartFormFields`):

1. **Regions to generate** — integer 0–5, default 2
2. **NPCs per region** — integer 0–10, default 3

Use the same UX patterns as death mode (labeled inputs, muted hint text explaining what the numbers mean). Disable while submitting. Wire into `useCampaignStartFlow` form state.

Depends on **039.1**.

#### Acceptance Criteria
- [x] Modal shows both fields with correct min/max/default values on first open
- [x] User can change values within bounds; out-of-range input is clamped or blocked with inline validation
- [x] Hint text explains that 0 is allowed but review will require at least 1 region and 1 NPC before continuing
- [x] Form reset on modal close/reopen restores defaults
- [x] UI test or component test verifies defaults and bound enforcement

### 039.3 Create-campaign IPC wiring for generation counts

#### Description
Thread `regionCount` and `npcsPerRegion` from renderer through preload-safe IPC into `createCampaignFromRequest` / `toSetupInput`, applying shared defaults when omitted.

Depends on **039.1**, **039.2**.

#### Acceptance Criteria
- [x] Preload + `window.campaigns.create` (or equivalent) accept the new fields on the typed payload
- [x] Main process validates via `isValidCreateCampaignRequest` before invoking generation
- [x] `CampaignSetupInput` (or generation entry type) receives resolved counts with defaults applied
- [x] Unit tests verify IPC handler rejects invalid counts and passes valid counts to setup input

### 039.4 Initial generation agent: parameterize region + NPC counts

#### Description
Replace hardcoded `MIN_REGIONS` / `MAX_REGIONS` / `NPCS_PER_REGION` in `campaignGeneration.ts` with the requested counts from campaign setup.

- Generation prompt asks for **exactly** `regionCount` regions and **exactly** `npcsPerRegion` NPCs per region (when region count > 0).
- Schema validation accepts 0 regions (empty `regions` array) and 0 NPCs per region when configured.
- When `regionCount` is 0, still generate the main story thread.
- When `regionCount` > 0 and `npcsPerRegion` is 0, regions persist with no NPCs (review/play gates handle the gap).
- Update fixtures and tests that assume 2–4 regions × 3 NPCs.

Depends on **039.3**.

#### Acceptance Criteria
- [x] `buildGenerationPrompt` uses caller-supplied counts, not fixed constants
- [x] Parse/validation enforces exact region count and per-region NPC count from the request
- [x] `generateAndPersistCampaign` (or equivalent) persists correctly for representative combos: (2,3) default, (0,3), (2,0), (1,1)
- [x] Malformed responses still retry/reject without partial writes (007.4 behavior preserved)
- [x] Unit tests updated; no tests rely on the old 2–4 region range unless explicitly testing legacy fixtures

### 039.5 Campaign review: continue validation (≥1 region, ≥1 NPC)

#### Description
On onboarding `CampaignReview`, block **Continue to character creation** until the campaign has at least **1 region** and at least **1 NPC** total (campaign-wide, not per region).

Show a short inline message when blocked explaining what is missing (e.g. "Add at least one region" / "Add at least one NPC"). The generate-region and per-region generate-NPC actions (039.7) are the intended remediation paths.

Depends on **039.4** (campaigns may legitimately start with 0 regions or 0 NPCs after generation).

#### Acceptance Criteria
- [x] Continue button disabled (or click shows validation message) when `regions.length === 0`
- [x] Continue button disabled when total NPC count across all regions is 0
- [x] Continue enabled when both thresholds are met
- [x] Message updates dynamically as regions/NPCs are added via generation or edits
- [x] UI test covers blocked and unblocked states

### 039.6 Generate-region modal: NPC count + additional-region pipeline

#### Description
Extend the existing **Generate another region** flow (`CampaignReviewGenerateModal`, `useGenerateRegion`, `generateRegionForCampaign`, `generateAdditionalRegion`):

- Add **NPCs to generate** control: integer 0–10, default **3**
- Pass `npcCount` through IPC (`GenerateRegionInput`) into the agent
- Update `buildAdditionalRegionPrompt` and additional-region schema validation to require exactly `npcCount` NPCs (0 allowed)
- Reject duplicate region names as today

This modal pattern is reused by hub region generation in **038.16** — keep the component/hook API reusable (counts + seed prompt).

Depends on **039.1** (bounds constants).

#### Acceptance Criteria
- [x] Generate-region modal shows seed prompt + NPC count (0–10, default 3)
- [x] Submit disabled while generating or when seed is empty
- [x] IPC + agent honor `npcCount`; persisted region has exactly that many NPCs
- [x] `npcCount = 0` produces a region with no NPCs
- [x] Unit tests for prompt text, validation, and IPC round-trip with varied counts
- [x] Onboarding review refreshes region list after success (existing behavior preserved)

### 039.7 Per-region generate NPC modal + pipeline

#### Description
Add a **Generate NPC** action on each `CampaignReviewRegionCard` that opens a seed-prompt modal matching the region-generation pattern (overlay, textarea, cancel/submit, loading/error states).

Implement backend support:

- New IPC e.g. `campaigns:generateNpc` with `{ campaignId, regionId, seedPrompt }`
- Agent function to generate **one** NPC tied to the target region by exact `regionName`
- Parse, validate, persist via existing NPC hydration path; return updated `CampaignDetail`

Ground the prompt in campaign premise, region name/description, and existing NPC names in that region (avoid duplicates). Reject empty seed.

Depends on **039.5** (players may need this to satisfy continue validation).

#### Acceptance Criteria
- [x] Each region card exposes a Generate NPC control
- [x] Modal mirrors region modal UX (seed textarea, cancel, submit, generating state, error display)
- [x] Successful generation appends exactly one NPC to the target region and refreshes the review UI
- [x] Empty seed blocked client-side and server-side
- [x] Duplicate NPC names rejected or retried per existing generation retry policy
- [x] Unit tests for agent parse/validation and IPC handler

### 039.8 Play entry gate: every region must have NPCs

#### Description
Introduce a shared guard — e.g. `assertCampaignPlayReady` or `getCampaignPlayBlockers` — that returns a blocker when **any region has zero NPCs**.

Enforce before entering `PlayView`:

- Onboarding path: after character creation / guided creation completes and app would mount `PlayView`
- Document hook point for **038.6 / 038.12** hub → play resume (same guard, no duplicate logic)

When blocked, show a clear message directing the player back to campaign review (onboarding) or hub world preview (post-038) to generate NPCs for empty regions. Do not silently fail.

Note: this is **stricter** than 039.5's continue gate (which only requires ≥1 NPC total). A campaign with two regions where only one has NPCs can pass review continue but must not enter play until every region is populated.

Depends on **039.5**.

#### Acceptance Criteria
- [x] Guard identifies campaigns where any `region` has `npcs.filter(regionId).length === 0`
- [x] Play entry is blocked with user-visible explanation when guard fails
- [x] Play entry succeeds when every region has ≥1 NPC
- [x] Unit tests cover: all regions populated, one empty region, zero regions (edge — should still be blocked by review continue earlier)
- [x] Guard is exported from a testable module (shared or main), not buried only in a React component

### 039.9 Integration tests + smoke coverage

#### Description
End-to-end verification for configurable generation counts and the new validation/generation gates.

Extend or add:

- Shared validation / IPC tests spanning 039.1–039.4
- Campaign review UI tests for continue blocking and unblocking
- Generate-region with custom NPC count
- Per-region NPC generation
- Play gate regression test

Update `docs/runbooks/campaign-start-smoke-test.md` (or add a focused runbook section) with manual steps: create campaign with 0 regions / 0 NPCs defaults overridden, confirm review gates, generate content, confirm play entry.

Depends on **039.2** through **039.8**.

#### Acceptance Criteria
- [x] Automated tests cover custom initial counts (e.g. 1 region × 1 NPC) through create → review handoff
- [x] Test verifies review continue blocked then unblocked after generation actions
- [x] Test verifies play gate blocks when a region lacks NPCs and allows when all regions have NPCs
- [x] Runbook documents manual smoke path for the new fields and validation behavior
- [x] `npm test`, `npm run lint`, and `npm run build` pass with all 039 tickets complete
