# EPIC: NPC core identity bundle (race, gender, alignment, class) & context-grounded generation

Epic **049** made race a first-class, campaign-scoped concept: every speaking NPC gets a `raceKey`, resolved-or-realized once per campaign via `resolveOrRealizeCampaignRace`, and NPC generation already threads `availableRaces` into its prompts (`src/agents/campaignGeneration/prompts.ts`, `normalize.ts`, `persist.ts`). But race is still decided in the *same* LLM call that writes the NPC's name, role, disposition, and backstory — the model is asked to invent flavor text and pick foundational identity facts in one breath, and only a one-line blurb (`AvailableRaceOption.blurb`) is available for grounding, never the NPC's own region's recorded history.

This epic mutates that pipeline: **decide the NPC's core identity bundle first — Race, Gender, Alignment, Class (or `commoner` if none) — then generate the backstory/flavor text in a second pass that is explicitly grounded in the region's own history and the *full* realized race lore**, not just a blurb. This directly extends the single-NPC "flagged" generation path already wired to Campaign Review's **Generate NPC** action (`useGenerateNpc.ts` → `campaigns:generateNpc` → `generateNpcForCampaign` in `src/main/campaignEditIpc.ts`, which takes a region + a free-text seed prompt — the "new NPC flagged through the story" trigger).

**Two new narrative-only concepts, alongside existing `Alignment`/`Temperament`/race:**
- **Gender** — a small fixed roster with a pronoun-context blurb, same shape as `AvailableRaceOption`, no per-campaign generation or locking (gender isn't world lore, it needs no realize-once step).
- **NPC class** — reuses the same five player `Archetype` keys (`fighter | rogue | mage | cleric | ranger`) plus a new `commoner` sentinel for the common case of an NPC with no adventuring training, each with a static blurb (engine-owned, not LLM-generated) — same "authored roster, not lore" pattern as race's seed prompts.

Builds on **049** (race catalog, `resolveOrRealizeCampaignRace`, `buildAvailableRaceOptions`, `campaign_races`) and reuses its `addColumnIfMissing` schema pattern, its `canSpeak`-gated validation pattern (`hasValidNpcAlignment`/`hasValidNpcRace` in `normalize.ts`), and its persistence touch points (`persistRegionWithNpcs`, `persistCampaignNpcsFromGeneration`, `generateNpcForCampaign`). This epic does **not** cover NPC backgrounds — that is a separate epic, **051** (NPC background integration), which extends the two-phase pipeline built here with one more grounding field once both this epic and **050** (character backgrounds) have landed.

Broken down into sub-tickets **052.1–052.9**. This epic is done when all are complete and `npm test`, `npm run lint`, and `npm run build` pass.

## Target flow (the "flagged NPC" path)

```
DM/player flags a new NPC in Campaign Review
  (existing UI: pick a region, type a seed/triggering-text prompt)
       │
       ▼
Phase 1 — core bundle only (no name, no backstory yet)
  region name + description, seed/triggering text
  + available races / genders / classes in this campaign
       │
       ▼
  { canSpeak, temperament, race?, gender?, alignment?, class? }
       │
       ▼
Race context resolution
  race already realized in this campaign?  → reuse locked lore, no LLM call
  race not yet realized?                    → resolveOrRealizeCampaignRace (existing, 049.4)
       │
       ▼
Phase 2 — final prompt, fully grounded
  current region/town + the region's own recorded history
  + full race lore (not just a blurb)
  + gender blurb, alignment, class blurb
       │
       ▼
  { name, role, disposition, backstory }  → persisted NPC
```

Non-speaking creatures (`canSpeak: false`) skip race/gender/alignment/class entirely in phase 1, exactly like they already skip alignment/backstory/race today — phase 2 for them just needs name/role/disposition.

## Gender roster (v1)

Engine-authored, not LLM-generated — same "fixed roster + blurb" shape as race's seed prompts, but no per-campaign lore/locking step, since gender carries no world-building meaning to establish.

| Key | Label | Blurb (the context injected into generation) |
|---|---|---|
| `man` | Man | Uses he/him pronouns. |
| `woman` | Woman | Uses she/her pronouns. |
| `nonbinary` | Nonbinary | Uses they/them pronouns. |
| `unspecified` | Unspecified | No fixed gender or pronoun is established for this character; refer to them by name or "they/them". |

## NPC class roster (v1)

Also engine-authored. Reuses the existing player `Archetype` union (`src/engine/hp.ts`) plus a `commoner` sentinel — this is narrative flavor grounding only, exactly like race; it does **not** grant mechanical class features, spells, or stat changes (an NPC's combat numbers still come entirely from `NpcCombatTier`/`RetiredAdventurerProfile`, untouched by this epic).

| Key | Label | Blurb |
|---|---|---|
| `fighter` | Fighter | Trained melee combatant, disciplined with weapons and armor. |
| `rogue` | Rogue | Stealthy and cunning, skilled at subterfuge or precision strikes. |
| `mage` | Mage | Studied arcane spellcaster who channels magic through training and ritual. |
| `cleric` | Cleric | Devoted spellcaster who channels divine power through faith or a deity. |
| `ranger` | Ranger | Wilderness-skilled warrior, a tracker and hunter at home outdoors. |
| `commoner` | Commoner | Ordinary person with no adventuring training — defined by trade or role in daily life, not combat or magic. |

## Core concept: bundle-first, then context-grounded flavor text

- **Every one of the four bundle fields must have a "prompt to inject"** — a piece of context text usable when writing the NPC's backstory:
  - **Race** → already has this: the full locked `RaceLore` (`summary`, `appearance`, `culture`, `roleInThisLand`, `hooks`) once realized via `resolveOrRealizeCampaignRace` (049.3/049.4). This epic's change is *using the full lore object* in the final prompt instead of just the one-line blurb used today for race selection.
  - **Gender** → the roster blurb above (pronoun grounding). No generation needed.
  - **Alignment** → already adequate as-is: the alignment label itself (e.g. "Lawful Neutral") is passed as established fact today in identity/opening-scene prompts (049.11) with no separate blurb; audited and reused unchanged here.
  - **Class** → the roster blurb above (what a "fighter" or "commoner" normally is). No generation needed.
- **Two-call pipeline is new only for the single "flagged" NPC path** (`generateNpcForCampaign`). Bulk initial campaign generation and additional-region generation (`buildGenerationPrompt`, `buildAdditionalRegionPrompt`) keep their existing one-shot-per-NPC shape — they gain the two new fields (gender, class) in that same single call, but do **not** move to the two-phase pipeline (doing so would multiply LLM calls across an entire region's NPC batch for comparatively little benefit). The internal shortfall-filling top-up (`fillCampaignNpcShortfall` → `generateSingleNpc`, used only during initial bulk generation) is likewise left on the one-shot path.
- **Region's own recorded history, not just its description, is new grounding for the flagged path.** Today `generateNpcForCampaign` passes only `region.description` into the prompt; it never reads `listRegionHistoryByRegion`. This epic adds that region-history text to the phase-2 prompt only (bulk/additional-region prompts already receive comparable historical context via `CampaignHistoryContext` where applicable, or are seeding the region for the first time and have no prior history to read).

## Schema

Two nullable, purely additive columns on `npcs` (no CHECK constraint, no rebuild needed — same precedent as `race_key` in 049.2 item 2):

- `gender_key TEXT` — set when `canSpeak` is true, `null` for non-speaking creatures and pre-epic NPCs.
- `class_key TEXT` — set when `canSpeak` is true (`'commoner'` for NPCs with no adventuring training), `null` for non-speaking creatures and pre-epic NPCs.

## Definition of done

- `GenderKey` and `NpcClassKey` rosters exist as engine-authored, unit-tested data (no LLM generation, no per-campaign locking)
- `npcs.gender_key` and `npcs.class_key` columns exist; `Npc`/`CreateNpcInput`/`NpcRow` include `genderKey`/`classKey`, mapped to/from the new columns
- Bulk campaign generation, additional-region generation, and shortfall top-up all request and validate gender + class for every speaking NPC, gated by `canSpeak` exactly like alignment/race/backstory are today; non-speaking creatures omit all four
- The Campaign Review "Generate NPC" (flagged) path first generates only the core bundle (race, gender, alignment, class, plus `canSpeak`/`temperament`), then — only if the chosen race isn't already realized in this campaign — locks its lore, then generates name/role/disposition/backstory in a second call that is given the full race lore, the region's own recorded history, and the gender/class blurbs as established fact
- A flagged NPC whose race is already realized in the campaign reuses the locked lore with no second race-lore LLM call
- Every persisted speaking NPC (regardless of which generation path created it) has `raceKey`, `genderKey`, `alignment`, and `classKey` all set; non-speaking NPCs have all four `null`
- NPC traits UI shows gender and class alongside the existing temperament/alignment display, hidden gracefully for pre-epic NPCs with no value
- Smoke runbook covers: a flagged NPC realizing a brand-new race, a second flagged NPC in the same campaign reusing that race's locked lore, and a non-speaking flagged creature (all four bundle fields omitted)

052.1 Gender & NPC-class rosters + blurbs · 052.2 schema: `gender_key` + `class_key` npc columns · 052.3 bulk/additional-region generation requests + validates gender & class · 052.4 persist gender/class across bulk & additional-region call sites · 052.5 NPC core-bundle agent (phase 1) · 052.6 region-history + full-race-lore grounded final NPC prompt (phase 2) · 052.7 wire flagged-NPC generation to the two-phase pipeline · 052.8 NPC traits UI shows gender + class · 052.9 smoke test + runbook update

## Relationship to other epics

- **049** (race selection): this epic is a direct extension — it reuses `resolveOrRealizeCampaignRace`, `buildAvailableRaceOptions`, `campaign_races`, and the `canSpeak`-gated validation pattern verbatim; it does not change race's own lore-generation or locking behavior, only when and how fully that lore is fed into NPC backstory generation.
- **050** (character backgrounds): independent, player-only epic; no shared code paths with this epic. The only coordination point is `src/db/schema.ts` migration version numbers — whichever epic lands second takes the next free version.
- **051** (NPC background integration): builds directly on this epic's phase-1/phase-2 pipeline (052.5/052.6) and on 050's `BACKGROUND_ROSTER`, adding background as a fifth bundle field once both are in place. Land order should be 049 → 050 → 052 → 051 regardless of file numbering.
- **039** (configurable generation counts / review validation): the flagged-NPC path still ends by calling `createNpcWithCombatReview` — unaffected combat-review step, just fed a richer/persisted NPC.
- **Campaign generation** (`src/agents/campaignGeneration/`): bulk and additional-region prompt/normalize/persist all gain two new fields but keep their existing one-call-per-NPC shape; only the single-NPC flagged path (already wired through `campaigns:generateNpc`) gains the new two-phase pipeline.

## Out of scope

- Mechanical effects of gender or class on any character — no ability scores, no spells, no combat stats; `NpcCombatTier`/`RetiredAdventurerProfile` remain the sole source of NPC combat numbers
- Gender or NPC-class fields on player characters or AI party members — this epic is NPC-only; extending gender to players/party members (mirroring how race did in 049.8) is a candidate for a future epic
- NPC backgrounds — that is epic **051**, which builds on this epic's pipeline rather than being included here
- Backfilling `gender_key`/`class_key`/`race_key` onto NPCs that existed before this epic
- Automatic detection of a new NPC from DM narration during play — "flagged" here still means the existing human-triggered Campaign Review seed-prompt action, not a new auto-detection feature
- Moving bulk campaign generation or additional-region generation to the two-phase (bundle-then-final) pipeline
- Changing race's own generation/locking behavior (untouched, reused as-is from 049)
- A player-facing or DM-facing UI to edit an NPC's gender/class after generation (out of scope, same as race has no post-lock editor)

## Sub-tickets

### 052.1 Gender & NPC-class rosters + blurbs

Depends on: none

#### Description
Author the two new engine-owned rosters, mirroring `src/engine/raceSelection/roster.ts` + `src/shared/raceSelection/types.ts`'s type/data split. No schema, no LLM behavior — just typed data and its shared types.

#### Acceptance Criteria
- [x] `src/shared/npcGender/types.ts` defines `GENDER_KEYS = ['man', 'woman', 'nonbinary', 'unspecified'] as const`, `GenderKey`, `GENDER_ROSTER: { key: GenderKey; label: string; blurb: string }[]` per the table above, `isGenderKey`/`parseGenderKey` mirroring `isAlignment`/`parseAlignment` (`src/shared/alignment/types.ts`)
- [x] `src/shared/npcClass/types.ts` defines `NpcClassKey = Archetype | 'commoner'` (importing `Archetype` from `../../engine/hp`), `NPC_CLASS_ROSTER: { key: NpcClassKey; label: string; blurb: string }[]` covering all 6 keys per the table above, `isNpcClassKey`/`parseNpcClassKey`
- [x] Unit tests assert roster completeness (every entry has non-empty label/blurb), key uniqueness, and that `parseGenderKey`/`parseNpcClassKey` accept case-insensitive/whitespace-variant input and reject unknown keys (mirroring `parseAlignment`'s behavior)

### 052.2 Schema: `gender_key` + `class_key` npc columns

Depends on: 052.1

#### Description
Purely additive schema change — no constraint rebuild needed, same as `race_key` on `npcs` (049.2 item 2). Add `gender_key TEXT` and `class_key TEXT` via `addColumnIfMissing` inline in `schema.ts`'s next migration version, and thread the fields through the npc repository.

#### Acceptance Criteria
- [x] New migration version adds `gender_key TEXT` and `class_key TEXT` to `npcs` via `addColumnIfMissing`, inline in `src/db/schema.ts`
- [x] `Npc`/`CreateNpcInput`/`NpcRow` (`src/db/repositories/npcs.ts`) include `genderKey: string | null` and `classKey: string | null`, mapped to/from `gender_key`/`class_key` exactly like the existing `raceKey`/`race_key` plumbing (`rowToNpc`, `resolveCreateNpcDefaults`, `createNpc`'s INSERT)
- [x] Migration + repository tests cover round-trip of both new columns, including the `null` default for pre-existing rows

### 052.3 Bulk & additional-region NPC generation requests + validates gender & class

Depends on: 052.1

#### Description
Extend the existing one-shot generation paths (`buildGenerationPrompt`, `buildAdditionalRegionPrompt`, and the shortfall top-up's `buildSingleNpcPrompt`) to also request gender and class per speaking NPC, gated by `canSpeak` exactly like alignment/race/backstory already are. This ticket does **not** introduce the two-phase pipeline — it's the same single JSON-object-per-NPC call, with two more fields.

#### Acceptance Criteria
- [x] `GeneratedNpc` (`src/agents/campaignGeneration/types.ts`) gains `genderKey?: string` and `classKey?: string`
- [x] `NPC_JSON_EXAMPLE` and `NPC_PROSE_RULES` (`prompts.ts`) are extended to require gender and class (exact keys from supplied rosters) for speaking NPCs and omit them for non-speaking ones; a `formatAvailableGenders`/`formatAvailableClasses` helper (mirroring `formatAvailableRaces`) renders `GENDER_ROSTER`/`NPC_CLASS_ROSTER` into all three prompt builders
- [x] `normalize.ts` gains `hasValidNpcGender`/`hasValidNpcClass` (mirroring `hasValidNpcRace`), wired into `readNpcBehaviorFields` and `isGeneratedNpc` with identical `canSpeak` gating
- [x] Unit tests cover: prompts include gender/class rosters, normalize accepts/rejects gender & class per `canSpeak`, and existing race/alignment gating is unaffected

### 052.4 Persist gender/class across bulk & additional-region call sites

Depends on: 052.2, 052.3

#### Description
Thread `genderKey`/`classKey` from `GeneratedNpc` into `CreateNpcInput` at the two bulk/additional-region persistence call sites in `src/agents/campaignGeneration/persist.ts`. (The flagged single-NPC path, `generateNpcForCampaign`, is rewired separately in 052.7.)

#### Acceptance Criteria
- [x] `persistRegionWithNpcs` and `persistCampaignNpcsFromGeneration` pass `genderKey: generatedNpc.genderKey ?? null` and `classKey: generatedNpc.classKey ?? null` into `createNpcWithCombatReview`'s input
- [x] Unit/integration tests confirm a bulk-generated speaking NPC persists with non-null `genderKey`/`classKey`, and a non-speaking creature persists with both `null`

### 052.5 NPC core-bundle agent (phase 1)

Depends on: 052.1

#### Description
New phase-1 agent that decides only the NPC's core identity — never name or backstory — from region + seed/triggering text. Add `NpcCoreBundle` to `types.ts` and a new module for the prompt/generation function.

`NpcCoreBundle = { canSpeak: boolean; temperament: Temperament; raceKey?: string; genderKey?: string; alignment?: Alignment; classKey?: string }` — the four identity fields present if and only if `canSpeak` is true.

#### Acceptance Criteria
- [x] `src/agents/campaignGeneration/flaggedNpc.ts` exports `buildNpcCoreBundlePrompt(input: { regionName: string; regionDescription: string; seedPrompt: string; availableRaces: AvailableRaceOption[]; availableGenders: GenderRosterOption[]; availableClasses: NpcClassRosterOption[] }): string`, instructing the model to return ONLY `{"canSpeak":boolean,"temperament":string,"race"?:string,"gender"?:string,"alignment"?:string,"class"?:string}` — explicitly no name, role, disposition, or backstory yet
- [x] `generateNpcCoreBundle(provider, input): Promise<NpcCoreBundle>` parses via `tryParseJson`, validates `temperament` (`parseTemperament`) and, when `canSpeak` is true, that `race`/`gender`/`alignment`/`class` are all present and each key exists in the supplied available-options lists; retries up to `MAX_GENERATION_ATTEMPTS`
- [x] When `canSpeak` is false, all four identity fields are omitted from the returned bundle regardless of what the model returned for them
- [x] Unit tests cover: prompt assembly, malformed-output retry, canSpeak-true validation (all 4 fields required + must match rosters), canSpeak-false shape

### 052.6 Region-history + full-race-lore grounded final NPC prompt (phase 2)

Depends on: 052.5

#### Description
The phase-2 prompt that turns a locked `NpcCoreBundle` into name/role/disposition/backstory, grounded in the region's own recorded history (`listRegionHistoryByRegion`, not just `region.description`) and the *full* `RaceLore` object (not the one-line blurb used for race selection).

#### Acceptance Criteria
- [x] `buildFlaggedNpcFinalPrompt(input: { regionName: string; regionDescription: string; regionHistory: string[]; seedPrompt: string; existingNpcNames: string[]; bundle: NpcCoreBundle; raceLabel?: string; raceLore?: RaceLore; genderBlurb?: string; classBlurb?: string }): string` (`flaggedNpc.ts`) renders the region's history entries (from `listRegionHistoryByRegion`) alongside `regionDescription`, and — when the NPC speaks — the full race lore (`summary`, `appearance`, `culture`, `roleInThisLand`, `hooks`), gender blurb, alignment label, and class blurb as established fact, then asks for exactly `{"name":string,"role":string,"disposition":string,"backstory"?:string}` (backstory omitted only when `!bundle.canSpeak`)
- [x] `generateFlaggedNpcDetails(provider, input): Promise<{ name: string; role: string; disposition: string; backstory?: string }>` parses/validates via `tryParseJson` + retry (`MAX_GENERATION_ATTEMPTS`), requiring non-empty `backstory` only when `bundle.canSpeak`
- [x] Prompt reuses `NPC_NAMING_RULES` for naming variety and marks region history, seed prompt, and race lore as untrusted narrative content, matching existing guardrail language
- [x] Unit tests assert the assembled prompt contains the region history text, the full race lore fields (not just a blurb), and the gender/class blurbs when `canSpeak` is true, and omits identity grounding entirely when `canSpeak` is false

### 052.7 Wire flagged-NPC generation to the two-phase pipeline

Depends on: 052.6, 052.4

#### Description
Orchestrate phases 1–2 into one function and rewire the existing Campaign Review "Generate NPC" IPC handler to use it instead of today's one-shot `generateSingleNpc`.

#### Acceptance Criteria
- [x] `generateFlaggedNpc(db, provider, input: { campaignId: string; regionId: string; seedPrompt: string; existingNpcNames: string[] }): Promise<GeneratedSingleNpcResult>` (`flaggedNpc.ts`) runs: (1) `generateNpcCoreBundle` using `buildAvailableRaceOptions(listCampaignRaces(db, campaignId))` plus the gender/class rosters; (2) if the bundle speaks and its race isn't yet realized in this campaign, `resolveOrRealizeCampaignRace`; (3) `generateFlaggedNpcDetails` fed the resolved race lore (or none, for non-speaking) and `listRegionHistoryByRegion(db, regionId)`; (4) assembles and returns a full `GeneratedNpc` combining the bundle + details
- [x] `generateNpcForCampaign` (`src/main/campaignEditIpc.ts`) calls `generateFlaggedNpc` instead of `generateSingleNpc`, and persists `genderKey`/`classKey` (alongside existing `raceKey`) on `createNpcWithCombatReview`'s `CreateNpcInput`
- [x] `generateSingleNpc` (`src/agents/campaignGeneration/index.ts`) and `fillCampaignNpcShortfall`'s use of it are left unchanged — the two-phase pipeline is exclusive to the flagged path
- [x] Integration test (fake/capturing provider) demonstrates: a flagged NPC whose race is new to the campaign triggers exactly one race-lore generation call and the final backstory prompt contains that lore's `roleInThisLand`/`hooks` text; a second flagged NPC picking the same race in the same campaign triggers zero additional race-lore calls
- [x] Integration test covers a non-speaking flagged creature (e.g. seed prompt "a hostile dire wolf") ending up with `raceKey`/`genderKey`/`alignment`/`classKey` all `null`

### 052.8 NPC traits UI shows gender + class

Depends on: 052.4

#### Description
Surface the two new fields on the existing NPC traits display in Campaign Review, next to temperament/alignment.

#### Acceptance Criteria
- [x] `CampaignReviewNpcTraits.tsx` renders `Gender` (via `GENDER_ROSTER` label lookup) and `Class` (via `NPC_CLASS_ROSTER` label lookup) rows when the NPC has non-null `genderKey`/`classKey`, hidden otherwise (pre-epic NPCs)
- [x] Renderer test covers both fields displaying and the no-value fallback for a legacy NPC

### 052.9 Smoke test + runbook update

Depends on: 052.1–052.8

#### Description
Add `docs/runbooks/npc-core-bundle-smoke-test.md` and a focused integration test walking the full flagged-NPC lifecycle end to end.

#### Acceptance Criteria
- [x] Integration test: flag a new speaking NPC in a region via a fresh seed prompt → core bundle generates → race realizes and locks → final backstory prompt is grounded in that lore + the region's recorded history → NPC persists with race/gender/alignment/class all set
- [x] Integration test: a second flagged NPC in the same campaign picking the same (now-realized) race reuses the locked lore read-only, no second race-lore call
- [x] Runbook documents: triggering "Generate NPC" from Campaign Review with a seed prompt, verifying the resulting NPC's traits (including new Gender/Class rows), and re-triggering for the same race to confirm lore reuse
- [x] `npm test`, `npm run lint`, and `npm run build` pass
