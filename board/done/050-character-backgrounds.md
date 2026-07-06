# EPIC: Character backgrounds (preseeded roster + AI-written personal background)

Race selection (epic **049**) gave every player character a first-class ancestry with campaign-grounded lore, but a character's *life before the adventure* — acolyte, street thug, soldier, noble — is still only ever captured free-form inside the identity interview's "Who" foundation (epic **026**). There is no dedicated step where the player picks a background, no preseeded roster of classic TTRPG backgrounds, and nothing structured feeding "what this character did before" into the DM's conversations.

This epic inserts a **background selection** onboarding page between race selection and equipment selection, backed by an **engine-authored, preseeded roster** of classic backgrounds (Acolyte, Street Thug, Soldier, Noble, etc. — plus one deliberately odd entry: **Isekai'd**). The screen is deliberately simpler than race selection:

- A **dropdown** of the preseeded backgrounds.
- Selecting one populates a **read-only** text box with that background's simple description (the roster blurb — static authored data, no LLM call).
- Below that, a **free-form personal background** textarea where the player writes whatever they want about their character's history.
- A **Generate** button next to the free-form field opens a **modal** that asks for an optional guidance prompt, then has the AI write the personal background for the player (~2 paragraphs) using the available character information, campaign context, the selected background's description, and the player's modal prompt if they gave one. If they left the modal prompt empty, it still generates. The result populates the free-form field and remains fully editable.

The persisted background (key + personal story) is then fed into the identity interview ("Who are you") and opening-scene prompts as established fact, the same way race + lore already are (049.11), so it influences those DM conversations rather than being re-elicited from scratch.

**Scope note (v1): background is narrative/lore only.** No skill proficiencies, equipment grants, gold, or engine-enforced features — the deterministic rules engine is untouched. Unlike race, background is **not** campaign-scoped world lore: descriptions are fixed authored text (no per-campaign realize-once/locking step, no `campaign_*` catalog table), and the AI-written story is personal to one character.

Builds on **049** (phase-machine insertion, stage routing, onboarding page patterns, identity/opening-scene context threading), **047** (equipment selection step it hands off to), and **026** (guided creation stage machine + identity interview). The roster this epic authors (`BACKGROUND_ROSTER`) is later reused, unchanged, by NPC generation — see epic **051** (NPC background integration) and its relationship to epic **052** (NPC core identity bundle).

Broken down into sub-tickets **050.1–050.10**. This epic is done when all are complete and `npm test`, `npm run lint`, and `npm run build` pass.

## Target UX flow

```
Campaign review
  → Character setup
  → Race selection
  → Background selection                ← NEW
  → Equipment selection
  → Tell me about yourself (guided identity)
  → Help me set the stage (opening scene)
  → Play
```

```
Background selection page
  ┌──────────────────────────────────────────────────────────────┐
  │  Choose your background                                        │
  │                                                                │
  │  Background:  [ Soldier                       ▼ ]              │
  │                                                                │
  │  ┌──────────────────────────────────────────────────────┐    │
  │  │ (read-only: the selected background's simple           │    │
  │  │  description from the preseeded roster)                │    │
  │  └──────────────────────────────────────────────────────┘    │
  │                                                                │
  │  Your story                                    [ Generate ✦ ] │
  │  ┌──────────────────────────────────────────────────────┐    │
  │  │ (free-form textarea — the player writes whatever      │    │
  │  │  they want, or Generate fills it in; always editable) │    │
  │  └──────────────────────────────────────────────────────┘    │
  │                                                                │
  │                                      [ Choose your gear ]     │
  └──────────────────────────────────────────────────────────────┘

Generate modal
  ┌──────────────────────────────────────────────────────────────┐
  │  Write my background                                           │
  │  Anything you want the writer to work in? (optional)          │
  │  ┌──────────────────────────────────────────────────────┐    │
  │  │ (optional guidance prompt)                             │    │
  │  └──────────────────────────────────────────────────────┘    │
  │  [ Cancel ]                                    [ Generate ]   │
  └──────────────────────────────────────────────────────────────┘
```

## Preseeded background roster (v1)

Engine-authored data (`src/engine/characterBackground/roster.ts`), not LLM-generated — same "fixed roster + authored blurb" pattern as race seed prompts (049.1) and the gender/class rosters (052.1). The description column below is exactly what the read-only text box shows.

| Key | Label | Description (the read-only blurb) |
|---|---|---|
| `acolyte` | Acolyte | Raised in the service of a temple, you spent your years performing rites, tending shrines, and studying doctrine. Faith — kept or broken — shaped who you are. |
| `charlatan` | Charlatan | You've always had a silver tongue and a false identity or two. Cons, forgeries, and quick exits paid your way through life. |
| `criminal` | Criminal | You made your living outside the law — burglary, smuggling, or worse — and you still know the people and places polite society pretends not to. |
| `street_thug` | Street Thug | You grew up enforcing someone else's will in back alleys, collecting debts and cracking heads. Muscle was your trade, and the streets were your school. |
| `entertainer` | Entertainer | Stages, taverns, and street corners were your home. You lived to perform — music, story, dance — and learned to read a crowd like a book. |
| `folk_hero` | Folk Hero | You stood up when it mattered — against a tyrant, a monster, or a disaster — and the common folk still tell the story. Their hopes travel with you. |
| `guild_artisan` | Guild Artisan | You apprenticed in a craft — smithing, brewing, weaving — and earned your place in a guild. Your hands know honest work and your name carries weight among tradesfolk. |
| `hermit` | Hermit | You withdrew from society — to a shrine, a cave, a distant cell — in search of answers or escape. Solitude gave you insight the world hasn't heard yet. |
| `noble` | Noble | Born to title, land, or old money, you were raised with privilege, expectation, and the weight of a family name — whether you carry it proudly or fled from it. |
| `outlander` | Outlander | You come from the wilds far beyond city walls — a wanderer, forager, or tribal exile. Civilization is the foreign country; the wilderness is home. |
| `sage` | Sage | You spent years among books, scrolls, and scholars, chasing knowledge. There are questions you can answer that no one else in the room can. |
| `sailor` | Sailor | Years before the mast taught you rigging, weather, ports, and the kind of trouble found in each. The sea left its mark on you. |
| `soldier` | Soldier | You served in an army or militia — drilled, marched, and fought. Discipline, rank, and old comrades (or old enemies) follow you still. |
| `urchin` | Urchin | You grew up orphaned and poor on hard city streets, surviving on wit, speed, and knowing every rooftop and sewer grate no one else notices. |
| `merchant` | Merchant | You lived by the ledger and the caravan — buying, selling, haggling, and reading people's wants. Coin and contacts were your craft. |
| `farmhand` | Farmhand | You were raised on soil and seasons — planting, harvesting, tending animals. Plain, honest work built your strength and your patience. |
| `isekaid` | Isekai'd | You are not from this world at all. You woke here — pulled from another life entirely — with memories of a place no one here has heard of and no idea how, or why, you crossed over. |

Labels/wording are trimmable in **050.1** — this table is the starting authoring set, not a hard contract. `isekaid` is intentionally the only "odd one out" and must survive any trim.

## Core concepts

- **Static roster, not campaign lore.** Unlike race (049), a background's description is fixed authored text shown read-only — the *same* in every campaign. There is no realize-once/lock step, no catalog table, no Regenerate on the description. What *is* personal and generated is the character's own **background story**.
- **Two persisted fields on the character**: `background_key` (which roster entry) and `background_story` (the free-form/AI-written personal history). Both nullable — characters created before this epic simply have neither.
- **The Generate flow is assistive, never required.** The player can type their whole story by hand, generate and then edit, or generate with no guidance prompt at all. Confirming the page requires a background selection; the story may be empty (some players won't want one).
- **Generation inputs** (the "available information"): character name, archetype/class, ability scores, race label + locked race lore (when set), the campaign premise + current world summary, the selected background's roster description, and the optional player guidance prompt from the modal. Output is ~2 paragraphs of prose, no mechanics, no items, no stats.
- **Untrusted content framing**: campaign premise, world summary, race lore, any existing story draft, and the player's guidance prompt are passed as untrusted narrative content (matching `campaignGeneration/prompts.ts` guardrail language), never as instructions.
- **Downstream influence**: background label + description + personal story join the same "Mechanical character / established fact" identity block that already carries name, race + lore, alignment, archetype, and ability scores into the identity interview and opening scene (049.11 touch points: `IdentityInterviewContext` in `src/agents/guidedIdentity.ts`, opening-scene context in `src/agents/guidedOpeningScene.ts`, wired from `src/main/guidedCreationIdentity.ts` / `guidedCreationOpeningScene.ts`). The interview builds on the established background instead of re-eliciting "what did you do before" from nothing.

## Guided-creation phase extension

Add `background` to `guided_creation_phase`, positioned **after** `race` and **before** `equipment`:

`'none' | 'race' | 'background' | 'equipment' | 'identity' | 'opening_scene' | 'complete'`

- New player characters still default to `race` (unchanged).
- `race:apply` now advances phase `race → background` (was `race → equipment`).
- Completing background selection persists `background_key` + `background_story` and advances phase `background → equipment`.
- `stageRouting.ts` maps `background` → onboarding stage `backgroundSelection`.
- Play entry still requires `guided_creation_phase === 'complete'` (unchanged).
- Campaign hub second-character flow gets the same background step between race and equipment.
- Existing characters already at `equipment` or later are unaffected (they keep their phase; no background backfilled).

## Definition of done

- Preseeded background roster (all entries above, including `isekaid`) exists as engine-authored, unit-tested data
- `background` is a valid guided-creation phase between `race` and `equipment`; migration handles existing rows safely
- Background selection page: dropdown → read-only description → free-form story textarea → Generate button
- Generate opens a modal asking for an optional guidance prompt; generating with **and** without a prompt both work; result is ~2 paragraphs, populates the story field, and stays editable
- Generation prompt includes character info, campaign premise + world summary, the selected background's description, and the modal prompt when given — all with untrusted-content framing, mechanics-free output
- Confirming persists `background_key` + `background_story` and advances phase `background → equipment` in one transaction; reload mid-background resumes on the background page
- Identity interview and opening-scene prompts receive background label, description, and personal story as established fact
- Chosen background is visible on the character sheet
- Smoke runbook covers: setup → race → background (dropdown pick, generate-with-prompt, generate-without-prompt, hand-edit) → equipment → identity, verifying the interview references the background

050.1 background roster + descriptions · 050.2 schema: `background` phase + `background_key`/`background_story` columns · 050.3 background story agent · 050.4 background IPC surface · 050.5 onboarding stage routing + resume · 050.6 background selection UI (dropdown + read-only description + story + generate modal) · 050.7 wire race → background → equipment handoff · 050.8 feed background into identity/opening-scene context · 050.9 character sheet shows background · 050.10 smoke test + runbook

## Relationship to other epics

- **049** (race selection): direct structural precedent — reuse its phase-machine insertion (constraint rebuild migration, `migrateRaceSelectionCharactersV29.ts` pattern), stage routing/resume (049.5), onboarding page styling, and identity/opening-scene context threading (049.11). Note the key *difference*: no campaign-scoped catalog, no lore locking.
- **052** (NPC core identity bundle): no shared code paths — 052 is NPC-only, this epic is player-only. The only coordination point is `src/db/schema.ts` migration version numbers; whichever epic lands second takes the next free version.
- **051** (NPC background integration): depends on this epic's `BACKGROUND_ROSTER` (050.1) — it reuses the same roster and descriptions for NPCs, unchanged, adding no new authoring here.
- **047** (equipment selection): background hands off to the equipment step; equipment's own behavior is untouched beyond now being entered from `background` instead of `race`.
- **026** (guided creation): identity interview's "Who" foundation builds on the established background instead of eliciting personal history from scratch.

## Out of scope

- Any mechanical effects of background — no skill proficiencies, tool proficiencies, starting equipment, gold, or engine-enforced features
- Custom/player-minted background *types* — the dropdown is the preseeded roster only; personalization happens in the free-form story field (a "custom background" entry is a candidate future follow-up)
- Backgrounds for AI party members or NPCs in *this* epic — player characters only here; NPC background integration is epic **051**, reusing this epic's roster
- Backfilling a background onto characters that existed before this epic
- Changing background after confirm (no in-play background editor in v1)
- Back navigation from the background page (race is already applied by then; revisiting it would need phase rollback — out of scope, matching how equipment → race has no back today)
- Regenerating or editing the read-only roster descriptions — they are fixed authored data

## Sub-tickets

### 050.1 Background roster + descriptions

Depends on: none

#### Description
Author the preseeded background roster as engine-owned typed data, mirroring the race roster's type/data split (`src/shared/raceSelection/types.ts` + `src/engine/raceSelection/roster.ts`). No schema, no LLM behavior — just the roster table above as code.

#### Acceptance Criteria
- [x] `src/shared/characterBackground/types.ts` defines `BackgroundRosterEntry { key: string; label: string; description: string }` and `isBackgroundKey`/`parseBackgroundKey` helpers (mirroring `parseAlignment` in `src/shared/alignment/types.ts`: case-insensitive/whitespace-tolerant accept, unknown-key reject)
- [x] `src/engine/characterBackground/roster.ts` exports `BACKGROUND_ROSTER: BackgroundRosterEntry[]` with all entries from the roster table (17 at time of authoring), keys in stable lower_snake_case, including `isekaid` ("Isekai'd")
- [x] Unit tests assert roster completeness (every entry has non-empty key/label/description), key uniqueness, `isekaid`'s presence, and `parseBackgroundKey` accept/reject behavior

### 050.2 Schema: `background` guided-creation phase + `background_key`/`background_story` columns

Depends on: 050.1

#### Description
Constraint change on `characters.guided_creation_phase` — needs a full table rebuild, exactly like race's phase insertion. Copy the `migrateRaceSelectionCharactersV29Sql.ts` / `migrateRaceSelectionCharactersV29.ts` pattern: new DDL/copy-SQL constants + migration file registered as the next free migration version in `src/db/schema.ts` (coordinate with epic 052's schema ticket — whichever lands second takes the next number). Add nullable `background_key TEXT` and `background_story TEXT` columns to `characters` as part of the same rebuilt DDL (no second rebuild).

#### Acceptance Criteria
- [x] `background` is a valid `GuidedCreationPhase` in `src/shared/guidedCreation/types.ts`, ordered `['none', 'race', 'background', 'equipment', 'identity', 'opening_scene', 'complete']`
- [x] New migration rebuilds `characters` following the `migrateRaceSelectionCharactersV29` pattern: updated `guided_creation_phase` CHECK including `'background'`, plus nullable `background_key TEXT` and `background_story TEXT` columns
- [x] `Character`/`CreateCharacterInput`/`CharacterRow` (`src/db/repositories/characters.ts`) include `backgroundKey: string | null` and `backgroundStory: string | null`, mapped to/from the new columns like the existing `raceKey`/`race_key` plumbing
- [x] `createCharacter` for `kind: 'player'` still defaults `guided_creation_phase` to `race` (unchanged)
- [x] Migration + repository tests cover the new phase value, round-trip of both new columns, and the `null` default for pre-existing rows

### 050.3 Background story agent

Depends on: 050.1

#### Description
Add `src/agents/backgroundStory.ts`: a prompt builder + generation function that writes the character's personal background story (~2 paragraphs of prose) from the available character information, campaign context, the selected background's roster description, and an optional player guidance prompt.

#### Acceptance Criteria
- [x] `buildBackgroundStoryPrompt(input: { characterName: string; archetype: string; abilityScores: Record<string, number>; raceLabel: string | null; raceLore: RaceLore | null; campaignPremise: string; worldSummary: string; backgroundLabel: string; backgroundDescription: string; playerPrompt: string | null; existingStory: string | null }): string` instructs the model to write approximately two paragraphs of first-person-adjacent narrative prose about the character's life before the adventure, grounded in the background description and fitting the campaign
- [x] When `playerPrompt` is non-empty it is included as the player's requested direction; when null/empty the prompt still produces a complete story from the remaining context (no placeholder text, no refusal path)
- [x] Campaign premise, world summary, race lore, existing story draft, and player prompt are all framed as untrusted narrative content (matching `campaignGeneration/prompts.ts` guardrail language); the prompt forbids mechanics, stats, items, and spells in the output
- [x] `generateBackgroundStory(provider, input): Promise<string>` returns trimmed prose, rejects/retries empty output up to the existing `MAX_GENERATION_ATTEMPTS` pattern, and does not require JSON (plain prose response)
- [x] Unit tests cover: prompt assembly with and without `playerPrompt`, with and without race lore, the two-paragraph instruction, untrusted framing markers, and empty-output retry

### 050.4 Background IPC surface

Depends on: 050.2, 050.3

#### Description
Player-facing IPC: `background:getRoster`, `background:generateStory`, `background:apply`, following the `race:*` handler layout (`src/main/raceIpc.ts`) — new `src/main/backgroundIpc.ts`, registered in `src/main/index.ts`, exposed via preload as `window.background.*`, typed in `src/renderer/src/window.d.ts`.

#### Acceptance Criteria
- [x] `background:getRoster` returns `BACKGROUND_ROSTER` sourced from `src/engine/characterBackground/roster.ts`, not hardcoded in the renderer
- [x] `background:generateStory` accepts `{ campaignId, characterId, backgroundKey, playerPrompt?: string }`, loads the character (name, archetype, ability scores, race + lore via `getCampaignRaceByKey` when `raceKey` is set) and campaign (`premisePrompt`, `currentStateSummary`), and returns the generated story; never writes to the DB
- [x] `background:apply` accepts `{ campaignId, characterId, backgroundKey, backgroundStory: string }` and, in one transaction, persists `background_key` + `background_story` (story may be empty → persisted as null) and advances `guided_creation_phase` from `background` to `equipment`
- [x] `background:apply` rejects with a clear error if the character is not currently in `background` phase or if `backgroundKey` is not in `BACKGROUND_ROSTER`; `background:generateStory` rejects unknown `backgroundKey`
- [x] Preload exposes `window.background.*`; `window.d.ts` typed; unit tests cover generate (with/without player prompt, with/without race), apply (happy path, wrong-phase rejection, unknown-key rejection, empty-story-to-null)

### 050.5 Onboarding stage routing + resume

Depends on: 050.2

#### Description
Add `backgroundSelection` to `OnboardingStage` and wire `stageRouting.ts` (`stageForGuidedPhase`, `findGuidedCreationPlayer` phase finders) plus `App.tsx`/`onboardingStageRoutes.tsx` so a reload mid-background resumes on the background page — same shape as 049.5.

#### Acceptance Criteria
- [x] `OnboardingStage` includes `backgroundSelection` between `raceSelection` and `equipmentSelection`
- [x] `stageForGuidedPhase('background')` returns `backgroundSelection`; incomplete-player detection treats `background` as incomplete guided creation
- [x] Reload/campaign-select while a player is in `background` phase resumes on the background page (including the campaign hub second-character path)
- [x] Unit tests in `stageRouting.test.ts` cover the new stage and resume from `background` phase

### 050.6 Background selection UI (dropdown + read-only description + story + generate modal)

Depends on: 050.4, 050.5

#### Description
Build the background selection onboarding view (`src/renderer/src/backgroundSelection/`, mirroring `raceSelection/`'s file layout and `CharacterSetup` styling): a `<select>` of roster labels, a read-only description box that populates on selection, the free-form story textarea beneath it, and the Generate button + modal.

#### Acceptance Criteria
- [x] Dropdown renders from `background:getRoster`; nothing selected initially; selecting an entry populates the read-only description box with that entry's roster description (no LLM call, no edit affordance on the description)
- [x] Free-form story textarea below the description accepts arbitrary player text and is always editable
- [x] Generate button (adjacent to the story field, enabled once a background is selected) opens a modal with an optional guidance-prompt textarea and Cancel/Generate actions
- [x] Modal Generate calls `background:generateStory` (passing the prompt only when non-empty), shows a loading state, closes on success, and replaces the story textarea content with the result — which remains editable; generating with an empty modal prompt works identically
- [x] Generation failure surfaces an error state in the modal without losing any story text already in the textarea; Cancel closes with no changes
- [x] Primary CTA (**Choose your gear**) is disabled until a background is selected (story may be empty), and calls `background:apply` on confirm
- [x] Renderer tests cover: dropdown → read-only description populate, hand-typed story confirm, generate-with-prompt flow, generate-without-prompt flow, generate-failure preserves existing text, and CTA gating

### 050.7 Wire race → background → equipment handoff

Depends on: 050.6

#### Description
Re-point the two ends of the new step: `race:apply` (`src/main/raceIpc.ts`) now advances phase `race → background`, and the renderer transitions race-confirm into `backgroundSelection`; background confirm applies via IPC, refreshes campaign detail, and transitions to `equipmentSelection`. Update the campaign hub second-character path identically.

#### Acceptance Criteria
- [x] `race:apply` advances `guided_creation_phase` from `race` to `background` (was `equipment`); its race-selection CTA label leads to background (e.g. **Choose your background**)
- [x] Successful race confirm in the renderer transitions to `backgroundSelection`; successful background confirm transitions to `equipmentSelection`
- [x] Equipment step is not reachable until background is applied (phase advanced to `equipment`)
- [x] Campaign hub "create character" flow passes through background between race and equipment
- [x] Existing race IPC/renderer tests updated for the new phase target; integration test walks race-apply → background-apply → equipment phase end to end

### 050.8 Feed background into identity/opening-scene context

Depends on: 050.4

#### Description
Extend the established-fact identity block that already carries name, race + lore, alignment, archetype, and ability scores (049.11) with the character's background. Touch points: `IdentityInterviewContext` + `buildMechanicalCharacterBlock` in `src/agents/guidedIdentity.ts`, the opening-scene context in `src/agents/guidedOpeningScene.ts`, and their wiring in `src/main/guidedCreationIdentity.ts` / `src/main/guidedCreationOpeningScene.ts`.

#### Acceptance Criteria
- [x] `IdentityInterviewContext` includes `backgroundLabel: string | null`, `backgroundDescription: string | null`, and `backgroundStory: string | null`, resolved from the persisted `background_key` via `BACKGROUND_ROSTER` lookup
- [x] `buildIdentityKickoffPrompt` and `buildIdentityInterviewPrompt` include the background fields in the established-fact identity block (omitted cleanly when null, like race), instructing the DM to build on the background rather than re-elicit it
- [x] Opening-scene agent context receives the same background fields
- [x] Background story is passed as untrusted narrative content, not instructions
- [x] Unit tests assert background label/description/story appear in the assembled kickoff, interview-turn, and opening-scene prompts, and that a background-less (pre-epic) character omits them without error

### 050.9 Character sheet shows background

Depends on: 050.4

#### Description
Surface the chosen background on the character sheet near where race already appears (`CharacterSheetRaceLine.tsx` pattern), resolved from `background_key` to its roster label.

#### Acceptance Criteria
- [x] Character sheet displays the background label near name/archetype/race, resolved via `BACKGROUND_ROSTER`
- [x] Characters with no background (pre-epic) render gracefully with the line hidden
- [x] Renderer test covers background display and the no-background fallback

### 050.10 Smoke test + runbook

Depends on: 050.1–050.9

#### Description
Add `docs/runbooks/character-background-smoke-test.md` and a focused integration test walking the full step end to end.

#### Acceptance Criteria
- [x] Integration test: player completes race → lands in `background` phase → applies a background with a story → phase advances to `equipment` → identity kickoff prompt contains the background label, description, and story
- [x] Integration test: `background:generateStory` without a player prompt still produces a non-empty story (fake provider), and with a player prompt the prompt text appears in the assembled LLM prompt
- [x] Runbook steps: setup → race → background (pick from dropdown, verify read-only description, generate with a modal prompt, regenerate with an empty modal prompt, hand-edit the result) → equipment → identity, verifying the DM references the background; plus mid-background app restart resuming on the background page
- [x] `npm test`, `npm run lint`, and `npm run build` pass
