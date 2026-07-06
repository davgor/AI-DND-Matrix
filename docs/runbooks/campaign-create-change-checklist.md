# Campaign create — change checklist

Use this **in addition to** the normal delivery gate (`npm test`, `npm run lint`, `npm run build`) whenever you change how initial campaigns are generated, validated, persisted, or surfaced in the create UI.

Touches any of these paths? **Run this checklist.**

| Layer | Key files |
|-------|-----------|
| Staged generation | `src/agents/campaignGeneration/index.ts`, `prompts.ts`, `normalize.ts`, `persist.ts`, `fixtures.ts` |
| Create IPC | `src/main/campaignCreateIpc.ts` |
| Progress / stages | `src/shared/campaignCreate/types.ts`, `stageMessages.ts` |
| Legacy generate | `src/main/campaignIpc.ts` (`generateCampaignFromPrompt`) |
| Review after create | `src/renderer/src/campaignReview/*` (world section) |

---

## 1. Contract tests (required before done)

Scripted provider tests are **not** enough on their own. Live models return different shapes than `buildCascadingSeedResponses`.

**Always run:**

```bash
npx vitest run src/main/campaignCreateIpc.contract.test.ts
```

**When you change validation or prompts, also:**

1. Update or add a fixture in `src/agents/campaignGeneration/fixtures.ts` that mirrors **real** model drift:
   - snake_case keys (`world_name`, `region_name`, `story_thread`)
   - single-newline world paragraphs (not only `\n\n`)
   - human-readable enums (`Neutral Good`, `friendly`, `Human`, `Merchant`)
   - markdown JSON fences around world payload
2. Add a contract case in `campaignCreateIpc.contract.test.ts` using that fixture (default form: **2 regions, 3 NPCs, standard death**).
3. Add or extend unit tests in `campaignGeneration.test.ts` for new normalize/coercion rules.

Existing fixtures to reuse:

- `buildRealisticLlmCascadingSeedResponses` — Ashen Crown / desert caravan shape
- `buildCrimsonReachCascadingResponses` — mountain pass / friendly temperament / `Human` race

---

## 2. Pipeline invariants (do not break silently)

Initial create runs **world → regions → per-slot NPCs → story → persist**. Keep these behaviors unless the ticket explicitly changes them:

| Stage | Failure mode if wrong |
|-------|------------------------|
| World | Short prose rejected or padded — see `normalizeGeneratedWorld` / `padWorldProse` |
| Regions | Exact `regionCount`; names must match NPC `regionName` after normalize |
| NPCs | Each slot retries on duplicate names; shortfall top-up runs **before** final validation (`repairNpcShortfall`) |
| Story | `storyThread` or `story_thread` wrapper |
| Persist | Region lookup is fuzzy (`resolveGeneratedRegionName`); race keys must map to roster (`normalizeRaceKeyForRoster`) |

**Mock provider pitfall:** per-region NPC names must be **globally unique** across regions in test queues. Duplicate prefixes (e.g. two regions both producing `Oakh One`) cause slot rejection and flaky tests.

**Outer retries:** full-pipeline attempts use `MAX_CAMPAIGN_SEED_ATTEMPTS` (5). Per-stage retries use `MAX_GENERATION_ATTEMPTS` (3).

---

## 3. Automated smoke (full gate)

```bash
npx vitest run \
  src/main/campaignCreateIpc.contract.test.ts \
  src/main/campaignCreateIpc.test.ts \
  src/agents/campaignGeneration/campaignGeneration.test.ts \
  src/main/campaignIpc.test.ts
```

Then:

```bash
npm test
npm run lint
npm run build
```

---

## 4. Manual smoke with a real provider (required for prompt/schema changes)

Vitest uses system Node and scripted JSON. **One real create** catches ABI, provider, and coercion gaps.

1. Close any running Electron app (unlocks `better-sqlite3` rebuild).
2. `npm run rebuild:electron` then `npm run dev` (or `npm run build` + launch packaged app).
3. Create a campaign with **default counts** (2 regions, 3 NPCs) and a premise similar to recent failures, e.g.:
   - *"After a failed harvest, survivors gather in a mountain pass and face bandits who now wear the faces of the dead."*
4. Confirm:
   - Progress labels mention world → regions → NPCs → story → save (no generic hang)
   - **No** "The narrative engine returned an invalid campaign"
   - Campaign Review shows World section + regions + NPCs
5. If it fails, check main-process logs for `CampaignGenerationSchemaError` or persist region/race errors before loosening validation blindly.

---

## 5. When you change schemas or columns

- Add migration + repository round-trip test (`campaigns.test.ts`, `migrateCampaignWorldV34.test.ts` pattern).
- Update `createCampaign` for pre-migration DBs if tests seed legacy schemas (`campaignHasWorldColumns`).
- Update `questLogSmokeFixtures` and any hand-built `CampaignGenerationResult` objects to include `world`.

---

## 6. UI / copy changes only

If you **only** change create modal labels or progress text (no agent/schema/persist logic):

- Run `src/shared/campaignCreate/stageMessages.test.ts`
- Manual check that loading text matches `mapCreateStageToPlayerMessage`

---

## Quick checklist (copy into ticket)

```
Campaign create change:
- [ ] Contract test updated/passing (campaignCreateIpc.contract.test.ts)
- [ ] Realistic LLM fixture updated if validation/prompts changed
- [ ] campaignGeneration.test.ts covers new normalize/coercion rules
- [ ] npm test / lint / build — pass
- [ ] One manual create with real provider (default 2 regions, 3 NPCs)
- [ ] Runbook cross-check: docs/runbooks/campaign-world-generation-smoke-test.md
```
