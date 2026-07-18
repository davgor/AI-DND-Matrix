# EPIC: Codebase pruning — dead code, unwired features, and copy-paste consolidation

The codebase was built fast and feature-first, and it shows in a specific way: not architecture-astronaut abstraction, but **accumulated orphans and copy-paste**. A systematic audit (all four layers: renderer, main/preload, agents, engine/db/shared) found whole modules that were implemented + tested but never wired into the app, a full legacy UI stack left behind by the play-rail migration, ~15 copy-pasted LLM retry loops, and a batch of exports whose only consumer is a test file. This epic prunes it.

**Scope rule (from the owner): tests are not pruning targets.** Test files are never deleted for being "heavy". Two narrow exceptions follow from pruning production code: (a) a test that exists *only* to cover a deleted production module is deleted with it, and (b) test-support files that live in production `src/` get **relocated**, not deleted. Live-path tests are untouched.

**Headline finding that makes the rest safer:** `npm run typecheck` does not check the renderer at all. `tsconfig.json` is a solution-style file (`"files": []` + references), and `tsc --noEmit -p tsconfig.json` type-checks nothing without `--build`; the second half of the script (`tsconfig.node.json`) explicitly excludes `src/renderer`. Running `tsc --noEmit -p tsconfig.web.json` directly today produces **40 errors across 27 files** — including a renderer call to `window.guidedCreation.readyToEnterPlay` (`src/renderer/src/onboarding/readyToEnterPlayHandler.ts:27`), an API that **does not exist** in preload (`src/preload/index.ts:292-302`). It never crashes only because the handler chain is itself dead code (see 061.5). Fixing the typecheck gap is ticket 1 and a prerequisite for confidently deleting renderer code.

**Relationship to epic 040 (LLM efficiency):** deliberately non-overlapping. 040 owns token cost, prompt slimming, call merging, and `systemPrompt` adoption. This epic owns structural deletion and deduplication. One coordination point: 061.6 (shared retry helper) touches the same schema loops 040.9 will thread `GenerateContext` through — whichever lands second adapts (the shared helper makes 040.9 *easier*: one place to pass context instead of 15).

**Estimated size:** ~1,300–1,700 production lines deleted outright, ~500 further lines relocated out of `src/` production paths, plus duplication consolidations. Every deletion is recoverable from git history; nothing here changes shipped gameplay behavior except where a ticket explicitly says "wire-or-delete decision".

Broken down into sub-tickets **061.1–061.9**. This epic is done when all are complete and `npm test`, `npm run lint`, `npm run build` pass — and `npm run typecheck` actually covers the whole codebase.

## Definition of done

- `npm run typecheck` covers main, preload, db, agents, engine, shared, **and renderer**, and passes
- Zero production modules whose only importer is a test file (engine scaffold modules, agents features, renderer legacy stack all resolved)
- The legacy pre-play-rail character-sheet component tree is gone
- Every "designed but never wired" feature has an explicit disposition: wired in, or deleted with README updated to stop claiming it
- One shared JSON-retry helper; no agent module hand-rolls the `generate → tryParseJson → parse → retry` loop
- Test fixtures/support files no longer live in production `src/` paths (`src/agents/campaignGeneration/fixtures.ts` et al. relocated)
- No new frameworks: consolidation tickets only land where the diff is net-negative in lines and does not obscure call sites

061.1 renderer typecheck gap · 061.2 dead renderer code · 061.3 dead engine + db code · 061.4 dead agents code + legacy generation path · 061.5 dead main/preload code + unwired-feature decisions · 061.6 shared LLM retry helper · 061.7 main/engine/shared dedupes · 061.8 renderer dedupes · 061.9 test-support relocation + export hygiene

## Sub-tickets

### 061.1 Close the renderer typecheck gap (do this first)

#### Description

`package.json`'s `typecheck` script runs `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json`. The first command checks **nothing** (`tsconfig.json` has `"files": []` and project references, which `-p` ignores without `--build`); the second excludes `src/renderer`. So the entire React app is type-checked by nobody — oxlint has no type information, and `electron-vite build` transpiles without checking. Verified: `npx tsc --noEmit -p tsconfig.web.json` currently reports **40 errors in 27 files**, including real bugs (a `Sidebar` `onRequestDelete` prop signature mismatch in `App.tsx`, and the phantom `window.guidedCreation.readyToEnterPlay` call).

Fix the script (e.g. `tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json`, or `tsc --build --noEmit`), then fix all existing renderer errors. Where an error is *in* code that a later ticket deletes (e.g. the legacy character-sheet stack, the `readyToEnterPlay` chain), prefer deleting under that ticket's scope rather than patching dead code — coordinate orderings so this ticket ends green.

#### Acceptance Criteria

- [x] `npm run typecheck` fails if a type error is introduced anywhere in `src/renderer` (verified by temporarily breaking a file)
- [x] All pre-existing renderer type errors resolved (fixed, or deleted under 061.2/061.5 scope) — `npm run typecheck` passes
- [x] CI runs the corrected typecheck (add to `pr-checks.yml` if not already implied by build)
- [x] `docs`/skill references to `npm run typecheck` remain accurate

---

### 061.2 Delete dead renderer code (legacy sheet stack + orphans)

#### Description

The play-view UX refresh (epic 043) replaced the fixed character-sheet sidebar with `PlaySheetRail` + overlay modals, but the old tree was never deleted. **Zero production imports** of the entry points (`CharacterSheet`, `PlayerSheetRail`) exist — verified by grep. The full dead tree in `src/renderer/src/characterSheet/`: `CharacterSheet.tsx`, `PlayerSheetRail.tsx`, `CharacterSheetBody.tsx`, `CharacterIdentitySection.tsx`, `characterIdentityParts.tsx`, `CharacterInventorySection.tsx`, `CharacterEquippedSlots.tsx`, `CharacterInventoryList.tsx`, `CharacterXpSection.tsx`, `CharacterSheetRaceLine.tsx`, `CharacterSheetBackgroundLine.tsx`, plus `characterSheet.css` and orphaned rules in `playerSheetRail.css:27-31,47-49` (live `PlaySheetRail` uses `play-sheet-*` classes). ~580 lines TSX + ~130 CSS. The duplicate `usePlayerSheetCollapse` in the dead `PlayerSheetRail.tsx:73-85` goes with it (live copy stays in `playView/PlaySheetRail.tsx`).

Other verified renderer orphans:

- `shared/scrollStreamItem.ts` (whole module, ~38 lines) — only its own test imports it
- `campaignHub/hubUtils.ts:27-72` — `buildHubSnapshotFromDetail` + private helpers, exported but never imported; duplicates `main/campaignHubIpc.ts` server logic
- `characterSetup/abilityScoreMethod.ts` — 5-line re-export shim, zero importers
- `characterName` prop declared and drilled through `RaceSelection.tsx`, `BackgroundSelection.tsx`, `EquipmentSelection.tsx` + `onboardingStageRoutes.tsx:69,86,103` but never read
- `CUSTOM_RACE_KEY` re-exports at `useRaceSelection.ts:225`, `RaceSelectionForm.tsx:52`, `RaceSelectionCustomPanel.tsx:59` — never imported from those sites

#### Acceptance Criteria

- [x] Legacy character-sheet component tree, its CSS file, and orphaned `playerSheetRail.css` rules deleted; live play rail (`playView/PlaySheetRail.tsx`, `PlaySheetModals.tsx`, `playSheetRailTabs.tsx`) untouched and its tests pass
- [x] Tests that exist only to cover deleted components are removed with them; no live-path test deleted
- [x] `scrollStreamItem.ts`, `buildHubSnapshotFromDetail`, `abilityScoreMethod.ts` shim, `characterName` prop, and dead `CUSTOM_RACE_KEY` re-exports removed
- [x] `npm run typecheck` (post-061.1), `npm test`, `npm run lint`, `npm run build` pass
- [x] Manual smoke: play view renders sheet rail, tabs, and overlay modals as before

---

### 061.3 Delete dead engine + db code

#### Description

Four engine modules are imported **only by their own tests** (verified — production superseded each): `engine/timeCostAbility.ts` (~38 lines; spell lockout is narrated in tooltips but never enforced — see 061.5's README note), `engine/currency.ts` (~18; production uses `adjustCharacterCurrency` in `db/repositories/characters.ts`), `engine/deathStandard.ts` (~14; production uses `restoreLatestSave` via `main/playerDefeat.ts`), `engine/playerCombat.ts` (~10; superseded by `playerAttack.ts`).

Dead exports with zero non-test importers (verified by grep): `engine/hp.ts:143` `computeHPAverage`; `engine/combat.ts:22-34` `TurnState`/`startTurn`/`useAction` (keep `rollInitiative` — used by `combatOrchestration.ts`); `engine/perks.ts:66-72` `readPerkAcBonus`/`characterHasExtraAttack`; `engine/conditions.ts:20-27` `conditionForcesDisadvantage`/`conditionForcesAutoFailSave` (keep `canAct` — used by `combatTurn.ts:39`); `engine/startingLoadout/validate.ts:149` `isOffHandDisabledForWeapon`; `engine/equipment.ts:137` `listAccessorySlots`; `engine/quests.ts:43` `isQuestComplete` (inline into `isQuestRewardEligibleStatus`).

Dead repository exports: `db/repositories/sessions.ts` `startSession`/`listSessionsByLastPlayed` (~25 lines; production uses `touchLastPlayed` + `listCampaignsByLastPlayed`), `campaigns.ts:165` `listCampaigns`, `combatEncounters.ts:169` `deleteEncountersForCampaign` and `:191-212` `advanceEncounterTurnIndex` (superseded by `combatOrchestration.ts` turn advancement), `weaponDamageProfile.ts:130` `getEquippedWeaponRow`, `itemCanonicalization.ts:49` `findCanonicalItemByName`, `startingLoadout.ts:80` `isWeaponTwoHandedByName`, `npcs.ts:363` `setNpcConditions`, `characterItemModifications.ts:63` `removeModification`.

**Do not touch:** migration history in `schema.ts`, catalog seeds, `seedStarterItems.ts` (used at migration v27), any repository method main/agents actually call.

#### Acceptance Criteria

- [x] All listed modules/exports deleted (or, where a symbol has private in-file callers, unexported and trimmed); each deletion re-verified with a repo-wide grep before removal
- [x] Tests covering only deleted code removed with it; conditions/perks/combat tests keep coverage of the surviving functions (`canAct`, `applyPerk`, `rollInitiative`)
- [x] `/engine` still has no Electron/DB/LLM imports
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run typecheck` pass

---

### 061.4 Delete dead agents code + legacy monolithic generation path

#### Description

Unwired agent features (verified: only test importers):

- `agents/regionHistoryCompression.ts` (~36 lines) — LLM history compression that no runtime path ever calls. **Note:** README §Persistence claims regions have "periodically-compressed `region_history`" — deleting this makes the README wrong; 061.5's README truth-up covers it. Default disposition: delete (wiring a scheduler is new feature work, not pruning).
- `agents/catalog/decisionPolicy.ts` + `agents/catalog/qualityReport.ts` (~126 lines) — retrieve-or-create catalog policy never referenced by IPC, engine, or DM paths.
- `agents/dm.ts:580-626` — `proposeHomebrewFlavor` + `HomebrewFlavorProposal` (~45 lines); emergent-direction detection feeds level-up via `levelSpanContext.ts`, not this.
- Small dead symbols: `xp.ts:53` `previewXpBudget`, `itemModification.ts:59-72` `fallbackFireEnchantResponse`, `retiredAdventurerReview.ts:10` `RetiredAdventurerReviewError`, `guidedIdentity.ts:8` `MAX_IDENTITY_ATTEMPTS` re-export, `agents/index.ts` empty barrel, `questWindow.ts:57` dead `LogEntry` re-export.

Legacy pre-054 monolithic generation path (production code, test-only consumers): `campaignGeneration/prompts.ts:228-256` `buildGenerationPrompt` and `normalize.ts` `normalizeCampaignGeneration`/`defaultLegacyWorld`/`parseGenerationNpcs` (~80 lines) exist only to serve legacy-shape tests; the live cascade uses per-stage prompts and `resolveRegions`/`normalizeNpcList`. Delete the legacy path and its legacy fixtures/tests together (`LEGACY_*` payloads in `fixtures.ts`). **Campaign-create checklist applies** (`docs/runbooks/campaign-create-change-checklist.md`) since this touches `normalize.ts`/`prompts.ts` — the point of the checklist run is proving the live cascade path is byte-identical before/after.

#### Acceptance Criteria

- [x] Unwired agent modules and dead symbols deleted; repo-wide grep re-verified per symbol before removal
- [x] Legacy monolithic generation path removed; live cascade behavior proven unchanged (existing cascade contract tests pass unmodified; checklist followed)
- [x] `MAX_SCHEMA_ATTEMPTS` consumers unaffected (constant ownership moves in 061.6, not here)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run typecheck` pass

---

### 061.5 Dead main/preload code + unwired-feature decisions + README truth-up

#### Description

**The `readyToEnterPlay` chain is dead on all three sides** (verified): renderer builds `createHandleReadyToEnterPlay` (`app/usePlayEntryState.ts:90`) but nothing consumes it; the handler calls `window.guidedCreation.readyToEnterPlay` (`onboarding/readyToEnterPlayHandler.ts:27`) which preload never exposes; and `main/guidedCreationPlayHandoff.ts` (~107 lines — finalize opening scene, seed quests, import transcript to narration log) is registered in no IPC handler. Play entry works today through `enterPlayHandler`/`handleResumeFromHub` without it. **Decision required: wire or delete.** Default: delete all three sides (renderer handler + factory, `guidedCreationPlayHandoff.ts` + its test); if the transcript-import behavior is actually wanted, that's a feature ticket, not this epic.

Other verified main-process dead code:

- `campaignEditIpc.ts:36-48` `setCampaignDeathMode` — implemented + tested, never registered in `registerCampaignEditHandlers`. Wire-or-delete; default delete.
- `combatResolvers.ts:53` `acceptSurrender` — threaded from intent parsing through `combatTurnPhases.ts:81` but never read by `resolvePlayerAttack`. Dead parameter path; delete the threading (keep DM intent parsing only if epic 034 semantics require it — check `yieldReview` first).
- `combatOrchestration.ts:131-135` `_participantRefs` — unused parameter passed by every caller.
- Dead exports: `lootPipeline.ts:182` `mergeLootIntoTurn`, `raceIpc.ts:153` `resolveRaceLabel`, `campaignHubIpc.ts:125` `getCampaignLastPlayed`, `questXpContext.ts:11` `shouldTriggerQuestXp` alias, type re-exports at `lootPipeline.ts:192` / `progressionPipeline.ts:197`.
- No-op code: `turnIpc.ts:1011-1018` try/catch whose both branches rethrow identically; `lootPipeline.ts:13-15` `shouldSkipQuestLoot` identity function (misleadingly named — also gates quest **XP** in `progressionPipeline.ts:78`); unexport internal-only symbols in `combatFleeHelpers.ts` (7 exports, 2 external consumers).

**README truth-up (belongs with the deletions):** README currently claims region history is "periodically-compressed" (§Persistence) and that ability lockout is enforced ("locks the character out of acting", §Rules Engine) — neither is wired (061.3/061.4 delete the scaffolds). Update README to match shipped reality, or explicitly re-scope those features into backlog tickets.

#### Acceptance Criteria

- [x] `readyToEnterPlay` chain resolved end-to-end (renderer handler, phantom window call, `guidedCreationPlayHandoff.ts`) — wired with preload + IPC + consumer, or fully deleted; no phantom `window.*` API calls remain (061.1's typecheck enforces this)
- [x] `setCampaignDeathMode` and `acceptSurrender` dispositions decided and implemented; a one-line note in this ticket records the choice

**Dispositions (061.5):** `readyToEnterPlay` DELETE (all three sides); `setCampaignDeathMode` DELETE (never registered); `acceptSurrender` threading DELETE (DM intent parsing retained).

- [x] Listed dead exports, no-op try/catch, identity wrapper, and unused parameter removed
- [x] README no longer claims unshipped behavior (region-history compression, ability lockout) unless the feature was wired instead
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run typecheck` pass

---

### 061.6 One shared LLM schema-retry helper

#### Description

13 agent modules re-implement the same `for attempt → provider.generate → tryParseJson → parse → retry` loop (~7–11 lines each, ~105–120 lines total plus divergent fallbacks): `dm.ts`, `turnReview.ts`, `xp.ts`, `loot.ts`, `yieldReview.ts`, `defeatDisposition.ts`, `fleeNarration.ts`, `obituary.ts`, `itemModification.ts`, `levelUp.ts`, `guidedOpeningScene.ts`, `guidedIdentity.ts` (two loops), `retiredAdventurerReview.ts`. Four more (`backgroundStory.ts`, `raceLore.ts`, `worldSummaryRegen.ts`, `flaggedNpc.ts`) hand-roll `MAX_GENERATION_ATTEMPTS` loops while bypassing the existing private `generateWithRetries` in `campaignGeneration/index.ts:68-85`. One loop is outright broken: `retiredAdventurerReview.ts:34-38` returns unconditionally on the first iteration — the retry is fake and line 39 is unreachable.

Add one helper (e.g. `generateJsonWithRetry(provider, prompt, parse, { attempts, fallback, context })` in `agents/jsonResponse.ts` or a new `agents/llmCall.ts`), point all loops at it, and move `MAX_SCHEMA_ATTEMPTS` out of `dm.ts` (15 modules import a constant from the DM module today — wrong ownership) into the helper's module. Preserve each module's exact fallback semantics (throw vs default vs clamp) — encode them as the `fallback` option, don't normalize behavior. Fix the `retiredAdventurerReview` loop to genuinely retry (its parse returns a default on garbage today; decide and test the real semantics).

**Coordination:** epic 040.9 wants `GenerateContext` (systemPrompt/maxTokens) passed on every retry attempt. Design the helper signature so 040.9 threads context through **one** place. Do not implement 040's token work here.

#### Acceptance Criteria

- [x] Single shared retry helper; zero hand-rolled schema loops left in `src/agents` (grep for `MAX_SCHEMA_ATTEMPTS` shows only the helper + tests)
- [x] Per-module fallback behavior preserved and covered by existing tests (throw paths still throw `DmSchemaError` etc.; default paths still default) — net diff is negative
- [x] `retiredAdventurerReview` retry fixed with a test proving retry-then-default behavior
- [x] `MAX_SCHEMA_ATTEMPTS` no longer lives in `dm.ts`
- [x] Helper accepts an optional per-call context object so 040.9 can adopt it without touching call sites again
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run typecheck` pass

---

### 061.7 Small dedupes across main / engine / shared

#### Description

Verified duplicate pairs where consolidation is a clear net win (no framework-building):

- `reloadEncounter` — `combatTurnPhases.ts:13-19` (exported) duplicated privately in `combatResolvers.ts:57-63`
- `findThreadById` — identical in `questLootContext.ts:40-47` and `questXpContext.ts:13-20`
- `encounterEligibleForLoot` / `encounterEligibleForXp` — byte-identical predicates (`lootPipeline.ts:17-19`, `encounterXpContext.ts:73-75`) → one `encounterEligibleForRewards`
- Quest-scale heuristics — `MAJOR_TITLE_KEYWORDS` + length threshold duplicated between `engine/quests.ts:5-15` and `main/questLootContext.ts:8-18`, with **diverging semantics** (engine checks `quest.kind === 'main'`, main copy doesn't). Unify deliberately; the unification is a behavior decision, test it.
- Damage-type lists — triplicated across `engine/modificationValidation.ts:15`, `shared/weaponModifications/types.ts:76`, `agents/dm.ts:588`; centralize on `engine/damage.ts` (respect the engine-has-no-LLM-imports boundary: shared/agents import *from* engine or shared, never the reverse)
- RNG helpers — `RandomSource`/`resolveSource`/`pick` duplicated between `shared/campaignCreate/randomFill.ts:12-39` and `shared/raceSelection/randomFill.ts:36-43`
- `readCanSpeak` — `campaignGeneration/normalize.ts:220-231` duplicated as `flaggedNpcParse.ts:22-31`
- Inactive-player region filter — `inactivePlayer.ts:27-38` (exported, used by `turnIpc.ts`) duplicated privately in `narrationContextFields.ts:20-38`

Explicitly **not** in scope: repository CRUD boilerplate (`rowToX` mappers etc.) — a generic base class would obscure per-entity SQL for no real line savings.

#### Acceptance Criteria

- [x] Each listed pair collapsed to one definition; call sites updated; net diff negative per item
- [x] Quest-scale unification has an explicit test pinning the chosen semantics for both XP and loot paths
- [x] Engine boundary intact (no new imports into `/engine` from db/agents/electron)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run typecheck` pass

---

### 061.8 Renderer dedupes (bounded — no component framework)

#### Description

Verified copy-paste in the renderer where consolidation is mechanical:

- **Back buttons:** `RaceBackButton.tsx`, `BackgroundBackButton.tsx`, `EquipmentBackButton.tsx` are identical 10-line components with near-identical CSS triplets (`raceSelection.css:179-194`, `backgroundSelection.css:12-28`, `equipmentSelection.css:148-163`) → one `OnboardingBackButton` next to the already-shared `ProceedButton.tsx` (~85 lines saved)
- **App stage handlers:** `App.tsx:125-161` — four identical refresh-then-advance handlers + back-handler variants → two small factories (~30 lines)
- **Play-blocker guard:** same `getCampaignPlayBlockers → canEnterCampaignPlay → setEnterPlayBlockerMessage` sequence in `enterPlayHandler.ts:21-24`, `usePlayEntryState.ts:29-32` (and `readyToEnterPlayHandler.ts` until 061.5 removes it) → one `guardPlayEntry` helper
- **Generate dialogs:** `GenerateNpcDialog.tsx:38-71` / `GenerateRegionDialog.tsx:67-103` share modal shell, Escape handling, error line, actions footer; `useGenerateNpc.ts` / `useGenerateRegion.ts` share the seed/generating/error state machine (~55 lines combined)
- **Thin wrappers, inline where used once:** `CampaignHubWorldHistoryModal.tsx`, `CampaignHubGenerateModal.tsx`, `RaceSelectionCustomSection.tsx`, `useEquipmentSelection.ts`, `onboardingStageRoutes.tsx:56-58` alias, `executeTurnSubmission` wrapper over `runTurnSubmission` (single call site)

**Deliberately deferred, not approved by this ticket:** extracting a generic `useIpcRoster`/`useSelectionDraft`/`useSelectionApply` from `useRaceSelection`/`useBackgroundSelection` (~65% structural overlap, ~90–110 lines). That's real duplication, but the generic-hook cure risks being the same heavy-handedness this epic is deleting. Only do it if, after the items above, a concrete diff shows it net-negative **and** no harder to read; otherwise leave a note here and skip.

#### Acceptance Criteria

- [x] Back button, App handlers, play-blocker guard, and generate dialog/hook dedupes landed; each net-negative in lines
- [x] Onboarding flows (race → background → equipment, back navigation) verified by existing tests + manual pass through character creation
- [x] Selection-hook extraction either skipped with a note, or landed with a demonstrated net-negative diff

**061.8 note:** Did not extract generic `useIpcRoster` / `useSelectionDraft` — race/background hooks differ enough that a shared abstraction would add indirection without a clear readability or line-count win.

- [x] `npm test`, `npm run lint`, `npm run build`, `npm run typecheck` pass

---

### 061.9 Test-support relocation + export hygiene

#### Description

Test-support code living in production paths (relocate, don't delete — tests keep working):

- `src/agents/campaignGeneration/fixtures.ts` (417 lines) — scripted mock-LLM payloads; zero production importers (verified: consumers are `campaign*Ipc*.test.ts`, integration tests, and `db/questLogSmokeFixtures.ts` which is itself test-only) → move to a test-fixtures location (e.g. `src/test/fixtures/`), update imports
- `src/agents/obituary.fixtures.ts` (~57 lines) — only `obituary.test.ts` uses it
- `src/renderer/src/shared/formattedTextTestUtils.ts` (~45 lines) — zero production imports

Export hygiene — symbols exported from production modules whose only external consumer is a test (unexport; have tests import internals directly or assert via public behavior): `turnIpc.ts:303-311` `resolvePlayerEquippedAttackDamage`, `modificationPipeline.ts:92-102` `catalogItemMechanicalEquals`, `normalize.ts:620-637` `hasValidNpcRace`/`Background`/`Gender`/`Class`, `defeatDisposition.ts:67` `buildDefeatPrompt`, `retiredAdventurerReview.ts:42` `buildReviewPrompt`, `shared/weaponModifications/types.ts:78-84` type guards, `RaceSelectionForm.tsx:9-10,52` / `BackgroundSelectionForm.tsx:15` part re-exports, `randomFill.ts:258-273` `randomCampaignSetupForm` + unused `randomRespawnCost`/`randomRespawnLimit` (comment at `:258` says "for tests"), `proseJargonGuard.ts` test-only exports. Also narrow `campaignGeneration/index.ts:55-60`'s `export * from './normalize'/'./prompts'` (30+ symbols re-exported; production imports 3–5).

Also: delete the empty placeholder barrels `engine/index.ts` and `shared/index.ts` (export nothing, nothing imports them).

#### Acceptance Criteria

- [x] No test fixtures/support modules remain in production `src/` paths; all moved with imports updated, zero test deletions
- [x] Listed test-only exports unexported (tests adjusted to import directly or assert behavior); `export *` barrels narrowed to actual consumers
- [x] Empty placeholder barrels deleted
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run typecheck` pass
