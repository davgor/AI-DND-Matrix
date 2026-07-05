# EPIC: Race selection (campaign-contextual ancestries)

After mechanical character setup (name, archetype, ability scores, party, death mode, portraits) the player advances straight to **equipment selection** (epic **047**) and then the guided identity interview (epic **026**). Ancestry/lineage is only ever captured free-form inside the identity interview's "Who" foundation — there is no dedicated step where the player picks a race, and nothing feeds a campaign-specific meaning of that race back into the AI.

This epic inserts a **race selection** onboarding page between `CharacterSetup` and `EquipmentSelection`, and makes race a **first-class, campaign-scoped concept** shared by player characters, AI party members, and generated NPCs — not just a player-facing cosmetic field.

The player picks from an **expanded fantasy roster** (grouped into categories, plus a **Custom** option). Each predefined race carries an engine-owned **seed prompt** describing "what an elf normally is"; the first time a race is ever referenced in a campaign (by a player picking it, an AI party member being assigned it, or the NPC-generation agent choosing it), the DM/lore agent mixes that seed with the **campaign premise** (and current world summary) to generate **what that race means in this land**, and that lore is then **locked in as canonical for the rest of the campaign** — every later character or NPC of that race reuses the same established lore instead of generating a new take. Picking **Custom** first prompts the player for a free-text seed ("what is this race?"), then generates campaign-fitting lore the player can edit before it locks in. **Only players can mint a brand-new custom race** (via this screen); AI party-member and NPC generation may only *select* from races that already exist — the predefined roster, or a custom race a player has already minted in this campaign.

**Scope note (v1): race is narrative/lore only.** No ability score modifiers, resistances, speed, or engine-enforced traits — the deterministic rules engine is untouched. Race is world flavor that grounds the AI, not a mechanical modifier. Mechanical racial traits are explicitly out of scope for this epic.

Builds on **009** (character setup UI), **026** (guided creation stage machine + identity interview), **047** (equipment selection onboarding step + phase-machine insertion pattern), and reuses the **seed-prompt + campaign-premise mixing** pattern from campaign region/NPC generation (`src/agents/campaignGeneration/prompts.ts`, `src/shared/campaignCreate/randomFill.ts`).

Broken down into sub-tickets **049.1–049.14**. This epic is done when all are complete and `npm test`, `npm run lint`, and `npm run build` pass.

## Target UX flow

```
Campaign review
  → Character setup (stats, archetype, party w/ name+class+personality+race, death mode, portraits)
  → Race selection (protagonist)      ← NEW
  → Equipment selection
  → Tell me about yourself (guided identity)
  → Help me set the stage (opening scene)
  → Play
```

```
Race selection page
  ┌────────────────────────────────────────────────────────────┐
  │  Choose your race                                            │
  │                                                              │
  │  Common Folk                                                 │
  │   [ Human ] [ Elf ] [ Half-Elf ] [ Dwarf ] [ Halfling ] [Gnome]│
  │  Outsider Bloodlines                                          │
  │   [ Half-Orc ] [ Tiefling ] [ Aasimar ] [ Dragonborn ] [Genasi]│
  │  Monstrous & Feral                                            │
  │   [ Orc ] [ Goliath ] [ Drow ] [ Lizardfolk ] [Kobold] [Beastfolk]│
  │  Uncanny & Otherworldly                                       │
  │   [ Fae ] [ Revenant ] [ Automaton ]           [ Custom race ✎ ]│
  │                                                              │
  │  — predefined pick, not yet established here: auto-generates lore below (editable) —│
  │  — predefined pick, already established here: shows locked lore, read-only —│
  │  — Custom pick: seed textarea (+ 🎲) then Generate (editable) —│
  │                                                              │
  │  What "Elf" means in this land       [ Regenerate ↻ ]*      │
  │  ┌────────────────────────────────────────────────────┐    │
  │  │ (summary, appearance, culture, role in this land,    │    │
  │  │  story hooks — editable unless already locked)       │    │
  │  └────────────────────────────────────────────────────┘    │
  │                                              *hidden if locked│
  │  [ Back ]                              [ Choose your gear ]  │
  └────────────────────────────────────────────────────────────┘
```

## Predefined roster (v1)

Engine-owned spec (`src/engine/raceSelection/SPEC.md`) — the roster, categories, and each race's "normally" seed prompt are authored data, not LLM-generated. The **lore** for a given campaign is generated once and locked; the **seed** is fixed forever.

| Category | Key | Label | Seed prompt (the "what is X normally" grounding) |
|---|-----|-------|--------------------------------------------------|
| Common Folk | `human` | Human | Adaptable, short-lived, ambitious; the most widespread and varied ancestry. |
| Common Folk | `elf` | Elf | Long-lived, graceful, magically attuned; deep ties to nature or high tradition. |
| Common Folk | `half_elf` | Half-Elf | Born of human and elf; caught between two worlds, charismatic and versatile. |
| Common Folk | `dwarf` | Dwarf | Stout, enduring mountain/underground folk; master smiths and stubborn traditionalists. |
| Common Folk | `halfling` | Halfling | Small, nimble, home-loving and lucky; unassuming survivors. |
| Common Folk | `gnome` | Gnome | Small, inventive, curious tinkerers and illusionists with long lives. |
| Outsider Bloodlines | `half_orc` | Half-Orc | Born of human and orc; powerful, resilient, fighting for acceptance. |
| Outsider Bloodlines | `tiefling` | Tiefling | Marked by an infernal or otherworldly bloodline; distrusted, resilient outsiders. |
| Outsider Bloodlines | `aasimar` | Aasimar | Touched by celestial power; radiant, burdened by expectation. |
| Outsider Bloodlines | `dragonborn` | Dragonborn | Draconic humanoids with a breath weapon lineage, prideful and clan-honor driven. |
| Outsider Bloodlines | `genasi` | Genasi / Elemental-touched | Bearer of elemental heritage (fire, water, air, earth) with a manifest trait. |
| Monstrous & Feral | `orc` | Orc | Strong, fierce, honor- or clan-bound warriors often cast as outsiders. |
| Monstrous & Feral | `goliath` | Goliath | Towering, mountain-dwelling folk built for endurance and competition. |
| Monstrous & Feral | `drow` | Drow | Subterranean dark elves from a harsh, insular, often matriarchal society. |
| Monstrous & Feral | `lizardfolk` | Lizardfolk | Cold-blooded reptilian folk, pragmatic and survival-minded. |
| Monstrous & Feral | `kobold` | Kobold | Small draconic-kin, communal, trap-clever, pack-minded. |
| Monstrous & Feral | `beastfolk` | Beastfolk | Animal-featured humanoids (varied) shaped by instinct and kinship. |
| Uncanny & Otherworldly | `fae` | Fae / Fairy | Small fey creatures of whimsy and old magic, bound to bargains and the wilds. |
| Uncanny & Otherworldly | `revenant` | Undead / Revenant | Returned from death; driven by unfinished purpose, apart from the living. |
| Uncanny & Otherworldly | `automaton` | Automaton / Construct | Artificial, awakened being of metal or clay seeking place and purpose. |
| — | `custom` | Custom race | Player-authored — no fixed seed; player supplies the seed prompt. Not a `RaceRosterEntry`. |

The roster is intentionally trimmable in **049.1** — this table is the starting authoring set, not a hard contract.

## Core concept: the campaign race catalog

Race stopped being a per-character-only field the moment party members and NPCs needed one too. Everything in this epic hangs off one mechanism:

- Every campaign has its own **race catalog** (`campaign_races` table, one row per race *realized in that campaign*, keyed by `(campaign_id, race_key)`).
- A race's **lore is generated exactly once per campaign, then locked**. The first time anything — a player picking it, an AI party member being assigned it, or NPC generation choosing it — references a given `race_key` in a campaign, the engine calls the lore agent (mixing the fixed/custom seed with `campaign.premisePrompt` + `campaign.currentStateSummary`) and writes a `campaign_races` row. Every subsequent reference to that same `race_key` in that campaign reuses the stored row **unchanged** — no second LLM call, no drift, no edits.
- This single realize-once/reuse-after operation is `resolveOrRealizeCampaignRace` (built in **049.4**, in `src/agents/raceLore.ts`). Every producer below calls it, or (for the player's own pick) a variant of it that allows one round of human editing before the first lock:

| Producer | Can mint a brand-new custom race? | Lore step |
|---|---|---|
| Player's own race selection (this epic's new screen) | **Yes** — the only path that can | Preview → player edits → confirm locks it (`race:apply`) |
| AI party member setup (existing 009.4 form, extended in **049.8**) | No — dropdown only | Silent resolve-or-realize, no edit UI |
| NPC generation (`campaignGeneration`, extended in **049.9**) | No — picks from what exists | Silent resolve-or-realize, no edit UI |
| NPC → party member promotion (**049.10**) | No — copies the source NPC's already-resolved race | No lore step at all; race just carries forward |

Because realization can be triggered by any of the first three producers, it's expected and fine for a race to become locked in a campaign **before** the protagonist ever reaches the race-selection screen — e.g. a companion named in Character Setup gets assigned "Elf" first, silently locking its lore, and when the protagonist later also picks "Elf" they see that same locked lore read-only. There is exactly one canonical lore per race per campaign; whoever gets there first "writes" it.

Predefined races never need minting — all 20 are always selectable by every producer, campaign-wide, whether or not they've been realized yet in that campaign. Only *custom* race concepts require a human (a player) to author the seed.

## Lore generation & locking model

- **Structured lore shape (locked, not illustrative)**: `RaceLore { summary: string; appearance: string; culture: string; roleInThisLand: string; hooks: string[] }`, defined once in `src/shared/raceSelection/types.ts` and used verbatim by the agent, the catalog, the IPC layer, and the UI.
- **Predefined race, not yet realized in this campaign**: preview-generates editable lore (mixing fixed seed + premise + world summary); player may edit and Regenerate before confirming; confirming locks it into `campaign_races` forever.
- **Predefined race, already realized in this campaign**: no generation call — the existing locked lore is shown read-only; the player can only confirm (no edit, no Regenerate).
- **Custom race**: player enters a free-text seed (with a 🎲 random-fill affordance reusing the shared random-seed pattern), generates editable lore, may edit/Regenerate, and confirming mints a brand-new `campaign_races` row with a freshly generated key.
- **Untrusted content framing**: campaign premise, world summary, and any custom seed are passed as untrusted narrative content (matching existing `campaignGeneration/prompts.ts` guardrail language), never as instructions.
- Lore generation is **advisory flavor** — it never proposes or alters mechanics, stats, items, or spells.
- **NPC race gating mirrors existing `alignment`/`backstory` gating exactly**: a speaking NPC (`canSpeak: true`) must have a race; a non-speaking beast/mindless undead (`canSpeak: false`) omits it, same as they already omit alignment and backstory today.

## Guided-creation phase extension

Add `race` to `guided_creation_phase`, positioned **before** `equipment`:

`'none' | 'race' | 'equipment' | 'identity' | 'opening_scene' | 'complete'`

- New player characters default to `race` (replacing today's default of `equipment`).
- Completing race selection persists the race key and advances phase `race → equipment`.
- `stageRouting.ts` maps `race` → onboarding stage `raceSelection`.
- Play entry still requires `guided_creation_phase === 'complete'` (unchanged).
- Campaign hub second-character flow uses the same race step before equipment.
- Existing characters already at `equipment` or later are unaffected (they keep their phase; no race backfilled).

## Definition of done

- Race roster (grouped into 4 categories) + fixed per-race seed prompts exist and are validated by engine unit tests
- Player characters start in `race` phase; migration handles existing in-progress rows safely
- Selecting a predefined race generates campaign-contextual, editable lore inline **the first time it's picked in a campaign**; every later pick of that same race (by any character, in the same campaign) reuses the locked lore read-only
- Custom race prompts for a seed first, mints a new campaign-scoped catalog entry with its own key, and is thereafter selectable the same way a predefined race is — including by NPC generation
- Lore agent mixes fixed/custom seed + campaign premise + world summary and never emits mechanics
- IPC persists race + finalized lore and advances phase `race → equipment` in one transaction
- AI party members defined during character setup each get a race (predefined, or a campaign custom already minted); no lore-editing UI needed for them
- Generated speaking NPCs each get a race selected from the campaign's available races (predefined roster + customs minted so far); beasts/mindless undead omit race
- NPC → party member promotion carries the source NPC's race forward unchanged, no regeneration
- The DM on the identity/opening-scene screens receives the full character identity — name, race (+ lore), alignment, archetype, ability scores — in both the kickoff and per-turn prompts
- `CharacterSetup` primary CTA leads to **Choose your race**; equipment step follows race confirm
- Chosen race is visible on the character sheet
- Back navigation returns to character setup without persisting a race or advancing phase
- Smoke runbook covers setup (with a party-member race) → race (predefined first-pick, predefined reused-lock, custom) → equipment → identity → play, plus an NPC-generation pass that selects a previously-minted custom race

049.1 race roster spec + seed prompts + categories · 049.2 schema: `race` phase + `campaign_races` catalog + `race_key` columns · 049.3 race lore agent (seed + premise mixing, locked shape) · 049.4 campaign race catalog repository + resolve-or-realize + player IPC · 049.5 onboarding stage routing + resume · 049.6 race selection UI (categorized roster + custom + locked-lore reuse) · 049.7 wire CharacterSetup → race → equipment handoff · 049.8 AI party member race selection · 049.9 NPC generation selects a race · 049.10 NPC promotion carries race forward · 049.11 feed race + lore into identity/opening-scene context · 049.12 character sheet shows race · 049.13 race selection back navigation · 049.14 smoke test + runbook update

## Relationship to other epics

- **047** (equipment selection): race sits immediately before equipment; reuse 047's phase-machine insertion, stage-routing, back-navigation, and setup-preservation patterns (047.5 / 047.8 / 047.11 / 047.12) rather than inventing new ones.
- **026** (guided creation): identity interview already asks about lineage free-form — after this epic the locked race + lore are passed in as context so the interview builds on it instead of re-eliciting it. Update 026 acceptance semantics: identity follows race → equipment.
- **009** (character setup UI): race selection is styled consistently with `CharacterSetup` / tavern onboarding, not `PlayView`. 009.4's existing AI-party-member form gains a race field (049.8).
- **Campaign generation** (`src/agents/campaignGeneration/`): NPC generation's prompt/normalize/persist pipeline gains race selection (049.9); this is the same subsystem that already generates regions, NPCs, and story threads from the campaign premise.
- Campaign generation seed-prompt pattern (`campaignGeneration/prompts.ts`, `randomFill.ts`): reused for seed + premise mixing and the custom-seed random-fill dice affordance.

## Out of scope

- Any mechanical racial traits (ability score modifiers, resistances, speed, darkvision, breath weapons, engine-enforced features)
- Backfilling a race onto characters or NPCs that existed before this epic shipped
- Changing race after confirm (no in-play race editor in v1); no editing a race's lore once it has locked in a campaign — realization is one-shot per `(campaign, race_key)`
- NPC and AI-party-member generation may only *select* from races that already exist (predefined roster + customs already minted by a player in this campaign) — they never mint a brand-new custom race themselves
- The AI-party-member setup form offers a race dropdown only (predefined + campaign customs minted so far) — no inline custom-race minting and no lore preview/editing for companions
- No player-facing UI to browse or manage the full campaign race catalog directly (e.g. no standalone "world races" list screen) — it's an internal mechanism surfaced only through each character's/NPC's own race field
- Race-gated content, items, or spells

## Sub-tickets

### 049.1 Race roster spec + seed prompts + categories

Depends on: none

#### Description
Author `src/engine/raceSelection/SPEC.md` and shared/typed data modules mapping each roster key to its label, category, and fixed "normally" **seed prompt**, plus the `custom` sentinel. No lore text, no mechanics — only the authoring roster and seeds that ground later AI generation.

#### Acceptance Criteria
- [x] `src/shared/raceSelection/types.ts` defines `RaceCategory = 'common_folk' | 'outsider_bloodlines' | 'monstrous_feral' | 'uncanny_otherworldly'` and `RaceRosterEntry { key: string; label: string; category: RaceCategory; seedPrompt: string }`
- [x] `src/engine/raceSelection/SPEC.md` documents the roster, the four categories, the fixed per-race seed-prompt authoring rule, and that race is narrative-only (no mechanics)
- [x] `src/engine/raceSelection/roster.ts` exports `RACE_ROSTER: RaceRosterEntry[]` with all 20 predefined entries per the roster table above, grouped into their categories, plus a separately-exported `CUSTOM_RACE_KEY = 'custom'` sentinel (not itself a `RaceRosterEntry`, since custom has no fixed seed)
- [x] Keys are stable, lower_snake_case identifiers matching the table's `Key` column; labels are display strings
- [x] Unit test asserts roster completeness (every entry has a non-empty label/category/seed prompt), that all four categories are represented, and that `custom`/`CUSTOM_RACE_KEY` is not present inside `RACE_ROSTER`

### 049.2 Schema: `race` guided-creation phase + `campaign_races` catalog + `race_key` columns

Depends on: 049.1

#### Description
Two kinds of schema change, following two different existing precedents in `src/db/schema.ts`:

1. **Constraint change (needs a full rebuild, like version 26's `migrateGuidedCreationEquipmentPhaseV26`)**: extend `GUIDED_CREATION_PHASES` to include `race` before `equipment`, and update the `characters` table's `guided_creation_phase` CHECK constraint. Do this exactly like the existing precedent: new `CHARACTERS_V29_DDL` / `COPY_CHARACTERS_TO_V29_SQL` constants in a new `src/db/migrateRaceSelectionCharactersV29Sql.ts`, applied by a new `src/db/migrateRaceSelectionCharactersV29.ts` (copy the drop/rename dance from `migrateGuidedCreationEquipmentPhaseV26.ts`), registered as the next migration version in `src/db/schema.ts`'s migrations array. Add a nullable `race_key TEXT` column to `characters` as part of the same rebuilt DDL (no need for a second rebuild).
2. **Purely additive changes (no constraint involved — inline in `schema.ts`, like version 8's `world_facts` table and version 22's `addColumnIfMissing` calls, no dedicated migration file needed)**: create `campaign_races`, and add `race_key TEXT` to `npcs` via `addColumnIfMissing`.

`campaign_races` columns: `id TEXT PRIMARY KEY`, `campaign_id TEXT NOT NULL REFERENCES campaigns(id)`, `race_key TEXT NOT NULL`, `kind TEXT NOT NULL CHECK (kind IN ('preset','custom'))`, `label TEXT NOT NULL`, `seed_prompt TEXT NOT NULL`, `lore TEXT NOT NULL` (JSON-serialized `RaceLore`), `created_by_character_id TEXT REFERENCES characters(id)`, `created_at TEXT NOT NULL`, `UNIQUE(campaign_id, race_key)`.

#### Acceptance Criteria
- [x] `race` is a valid `GuidedCreationPhase` in `src/shared/guidedCreation/types.ts`, ordered `['none', 'race', 'equipment', 'identity', 'opening_scene', 'complete']`
- [x] New migration rebuilds `characters` following the `migrateGuidedCreationEquipmentPhaseV26` pattern: updated `guided_creation_phase` CHECK including `'race'`, plus a new nullable `race_key TEXT` column, via new `migrateRaceSelectionCharactersV29Sql.ts` / `migrateRaceSelectionCharactersV29.ts` files registered in `src/db/schema.ts`
- [x] A second new migration version creates `campaign_races` (columns as specified above) and adds `race_key TEXT` to `npcs` via `addColumnIfMissing`, both inline in `schema.ts`
- [x] `createCharacter` for `kind: 'player'` defaults `guided_creation_phase` to `race`
- [x] `Character`/`CreateCharacterInput`/`CharacterRow` (`src/db/repositories/characters.ts`) and `Npc`/`CreateNpcInput`/`NpcRow` (`src/db/repositories/npcs.ts`) all include `raceKey: string | null`, mapped to/from `race_key`
- [x] No formal SQL foreign key from `characters.race_key` / `npcs.race_key` to `campaign_races` — referential integrity is enforced in the repository layer by always looking up `(campaignId, raceKey)` together; note this explicitly in a code comment on `getCampaignRaceByKey` (049.4)
- [x] Migration + repository tests cover: the new phase value, the new default, `campaign_races` round-trip, and `race_key` round-trip on both `characters` and `npcs`

### 049.3 Race lore agent (seed + premise mixing, locked shape)

Depends on: 049.1

#### Description
Add `src/agents/raceLore.ts`: a prompt builder that mixes a race seed (fixed preset seed, or a player's custom seed) with `campaign.premisePrompt` and `campaign.currentStateSummary`, returning structured campaign-fitting lore in a shape locked now (not "e.g.") because the catalog, IPC, UI, and NPC/party generation all build against it. Also add the `buildAvailableRaceOptions` helper that every race-picking prompt (player UI preview, NPC generation, party-member generation) will reuse to describe "what races already exist in this world."

#### Acceptance Criteria
- [x] `src/shared/raceSelection/types.ts` locks `RaceLore { summary: string; appearance: string; culture: string; roleInThisLand: string; hooks: string[] }` and `RaceLoreInput = { kind: 'preset'; raceKey: string; label: string; seedPrompt: string } | { kind: 'custom'; label: string; seedPrompt: string }`
- [x] `buildRaceLorePrompt(campaignPremise: string, worldSummary: string, input: RaceLoreInput): string` in `src/agents/raceLore.ts` marks campaign premise, world summary, and custom seed as untrusted narrative content (matching `campaignGeneration/prompts.ts` guardrail language)
- [x] `generateRaceLore(provider, campaignPremise, worldSummary, input): Promise<RaceLore>` parses the response via `tryParseJson` (matching `src/agents/npc.ts` / `partyMember.ts`), validates all 5 `RaceLore` fields are present, and retries on malformed output (matching `campaignGeneration`'s `MAX_GENERATION_ATTEMPTS` pattern)
- [x] Prompt instructs lore to be flavor-only and to fit the campaign; no mechanics, items, spells, or numbers
- [x] `buildAvailableRaceOptions(campaignRaces: CampaignRace[]): AvailableRaceOption[]` (`AvailableRaceOption { key: string; label: string; blurb: string }`) combines the full static `RACE_ROSTER` (`blurb` = `seedPrompt`) with any `kind: 'custom'` entries from `campaignRaces` (`blurb` = locked `lore.summary`), overriding a preset's `blurb` with its locked `lore.summary` when it's already realized in `campaignRaces`
- [x] Unit tests cover preset vs custom prompt assembly, malformed-output parsing/retry, and `buildAvailableRaceOptions` composition (unrealized preset, realized-preset override, custom inclusion)

### 049.4 Campaign race catalog repository + resolve-or-realize + player-facing IPC

Depends on: 049.2, 049.3

#### Description
`src/db/repositories/campaignRaces.ts` for catalog CRUD, the shared `resolveOrRealizeCampaignRace` orchestrator in `src/agents/raceLore.ts` (the realize-once/reuse-after mechanism described in "Core concept" above), and the player-facing IPC surface: `race:getRoster`, `race:getCampaignRaces`, `race:previewLore`, `race:apply`.

#### Acceptance Criteria
- [x] `src/db/repositories/campaignRaces.ts` exports `CampaignRace`, `CreateCampaignRaceInput`, `createCampaignRace(db, input)`, `getCampaignRaceByKey(db, campaignId, raceKey)`, `listCampaignRaces(db, campaignId)`, parsing the `lore` JSON column on read
- [x] `resolveOrRealizeCampaignRace(db, provider, params)` in `src/agents/raceLore.ts` returns the existing `CampaignRace` unchanged if `(campaignId, raceKey)` is already in the catalog (no LLM call); otherwise calls `generateRaceLore` then `createCampaignRace` and returns the new locked row
- [x] `race:getRoster` returns `RACE_ROSTER` (grouped by category), sourced from `src/engine/raceSelection/roster.ts`, not hardcoded in the renderer
- [x] `race:getCampaignRaces` returns `listCampaignRaces` for a given campaign
- [x] `race:previewLore` accepts `{ campaignId, kind: 'preset', raceKey } | { campaignId, kind: 'custom', label, seedPrompt }`. For an already-realized preset: returns `{ locked: true, lore }` straight from the catalog, **no LLM call**. For a not-yet-realized preset, or any custom: calls `generateRaceLore` fresh and returns `{ locked: false, lore }`. Never writes to the DB.
- [x] `race:apply` accepts `{ campaignId, characterId, kind, raceKey?, label, seedPrompt, finalLore }` and, in one transaction: if not yet realized, persists `finalLore` via `createCampaignRace` (custom races get a fresh key `` `custom_${randomUUID()}` `` generated here); if the race became locked by something else between preview and confirm, discards `finalLore` and uses the existing locked entry instead; either way sets `characters.race_key` and advances `guided_creation_phase` from `race` to `equipment`
- [x] `race:apply` rejects with a clear error if the character is not currently in `race` phase, or if a preset `raceKey` isn't in `RACE_ROSTER`
- [x] Preload exposes `window.race.*`; renderer `window.d.ts` typed; unit tests cover preview (fresh generation + already-locked reuse) and apply (first realization, reused-lock race condition, wrong-phase rejection)

### 049.5 Onboarding stage routing + resume

Depends on: 049.2

#### Description
Add `raceSelection` to `OnboardingStage`, update `stageForGuidedPhase`, `stageAfterCampaignSelect`, incomplete-player detection, and `App.tsx` handoffs so a reload mid-race returns to the race page and character setup routes into race.

#### Acceptance Criteria
- [x] `OnboardingStage` includes `raceSelection` between `characterSetup` and `equipmentSelection`
- [x] `stageForGuidedPhase('race')` returns `raceSelection`
- [x] Incomplete-player detection treats `race` as incomplete guided creation
- [x] Reload/campaign-select while a player is in `race` phase resumes on the race page
- [x] Unit tests in `stageRouting.test.ts` cover the new stage and resume from `race` phase

### 049.6 Race selection UI (categorized roster + custom + locked-lore reuse)

Depends on: 049.4, 049.5

#### Description
Build the race selection onboarding view (`src/renderer/src/raceSelection/`, mirroring `equipmentSelection/`): a roster grid grouped under the four category headers plus a Custom option. Selecting an **already-realized** predefined race shows its locked lore **read-only** (Confirm only). Selecting a **not-yet-realized** predefined race calls `race:previewLore` and shows editable lore with Regenerate. Selecting Custom shows a seed textarea (with a 🎲 random-fill affordance) and a Generate action before revealing editable lore. Confirm is blocked until a race is chosen and lore exists. Styled consistent with `CharacterSetup`.

#### Acceptance Criteria
- [x] Roster grid renders from `race:getRoster`, grouped under the 4 category headers (Common Folk, Outsider Bloodlines, Monstrous & Feral, Uncanny & Otherworldly) plus Custom; exactly one race selectable at a time
- [x] On mount, cross-references `race:getCampaignRaces` so already-realized predefined races are visually indicated (e.g. an "established in this world" badge) before the player even clicks one
- [x] Picking an already-realized predefined race calls `race:previewLore`, then shows the returned lore **read-only** — no Regenerate, no edit fields — with just a Confirm action
- [x] Picking a not-yet-realized predefined race calls `race:previewLore`, shows a loading state, then editable lore + Regenerate (re-calls `previewLore`, replacing the draft)
- [x] Picking Custom requires a seed (with random-fill dice) before Generate; result is editable + Regenerate, same as an unrealized preset
- [x] Player edits to unlocked lore are preserved and are what gets submitted; Confirm disabled until a race + non-empty lore exist; Confirm calls `race:apply`
- [x] Renderer tests cover: categorized roster render, unrealized-preset generate-then-edit flow, already-realized preset read-only flow, custom seed-then-generate flow, and confirm gating

### 049.7 Wire CharacterSetup → race → equipment handoff

Depends on: 049.6

#### Description
Change the `CharacterSetup` primary CTA to lead into race selection, and on race confirm call `race:apply`, refresh campaign detail, and transition to `equipmentSelection`. Update the campaign hub second-character path to use the same sequence (race before equipment).

#### Acceptance Criteria
- [x] `CharacterSetup` primary CTA leads to race selection (e.g. **Choose your race**), not equipment
- [x] `handleCharacterSetupComplete` transitions to `raceSelection`
- [x] Successful race confirm applies via IPC, refreshes detail, and sets stage to `equipmentSelection`
- [x] Equipment step is not reachable until race is applied (phase advanced to `equipment`)
- [x] Campaign hub "create character" flow reaches race selection before equipment

### 049.8 AI party member race selection

Depends on: 049.4

#### Description
The player can already add AI party members (name/class/personality) during Character Setup (epic 009.4), backed by `AiPartyMemberInput` / `createPartyMembers` / `replaceSetupPartyMembers` in `src/main/characterCreationIpc.ts`. **The exact current renderer call site for this form wasn't located by component name while authoring this epic** — grep for the `characters:createPartyMembers` / `characters:replaceSetupPartyMembers` IPC channel names (or the `window.characters.createPartyMembers` preload binding in `src/preload/index.ts`) to find it before editing. Add a required race field per companion: a simple `<select>` sourced from `race:getRoster` (predefined, always available) + `race:getCampaignRaces` (customs minted so far in this campaign) — **no lore preview/editing for companions**, they just pick a key.

`AiPartyMemberInput` gains `raceKey: string`. `createPartyMembers` / `replaceSetupPartyMembers` call `resolveOrRealizeCampaignRace` (using the campaign's `premisePrompt` / `currentStateSummary`) for each member's chosen key before persisting `race_key` on the new `characters` row.

#### Acceptance Criteria
- [x] `AiPartyMemberInput` (`src/main/characterCreationIpc.ts`) requires `raceKey: string`
- [x] The renderer form for adding AI party members includes a race `<select>` populated from predefined roster labels + `race:getCampaignRaces` custom labels for the current campaign; no new-custom-race minting or lore editing here
- [x] `createPartyMembers` and `replaceSetupPartyMembers` resolve-or-realize each member's `raceKey` via `resolveOrRealizeCampaignRace` and persist the result on `characters.race_key`
- [x] If two companions in the same submission pick the same not-yet-realized race, it is realized once and reused for both (no duplicate `campaign_races` rows, no duplicate LLM calls)
- [x] Unit tests cover: new-realization path, reuse-of-already-locked path, and two-companions-same-new-race de-duplication

### 049.9 NPC generation selects a race

Depends on: 049.4

#### Description
Every speaking NPC generated by the campaign-generation pipeline (`src/agents/campaignGeneration/`) must get a race, chosen from the campaign's available races — mirroring the existing `canSpeak`-gated `alignment`/`backstory` pattern already in this pipeline. Concrete touch points confirmed in the current code:

- `src/agents/campaignGeneration/types.ts`: add `raceKey?: string` to `GeneratedNpc`
- `src/agents/campaignGeneration/prompts.ts`: extend `NPC_JSON_EXAMPLE` with a `race` field and `NPC_PROSE_RULES` to require a race for speaking NPCs (chosen from a supplied available-races list) and omit it when `canSpeak` is false; thread a new `availableRaces: AvailableRaceOption[]` parameter into `buildGenerationPrompt`, `buildAdditionalRegionPrompt`, and `buildSingleNpcPrompt`, rendered via a shared formatting helper alongside the existing rule constants
- `src/agents/campaignGeneration/normalize.ts`: add `hasValidNpcRace` (mirrors `hasValidNpcAlignment`), and wire it into `readNpcBehaviorFields` and `isGeneratedNpc`
- `src/agents/campaignGeneration/persist.ts`: in `persistRegionWithNpcs` and `persistCampaignNpcsFromGeneration`, call `resolveOrRealizeCampaignRace` for each generated NPC's `raceKey` before/while calling `createNpcWithCombatReview`, passing the resolved key through to `CreateNpcInput.raceKey`
- `src/main/campaignEditIpc.ts` (`generateNpcForCampaign`) and `src/agents/campaignGeneration/index.ts` (`generateSingleNpc`): thread the same `availableRaces` (built via `buildAvailableRaceOptions(listCampaignRaces(db, campaignId))`) into `buildSingleNpcPrompt`, and apply the same resolve-or-realize + passthrough before calling `createNpcWithCombatReview`

#### Acceptance Criteria
- [x] All three prompt builders (`buildGenerationPrompt`, `buildAdditionalRegionPrompt`, `buildSingleNpcPrompt`) receive and render an available-races list (predefined roster labels always included, plus any campaign customs minted so far) and instruct the model to pick a `race` key from it for every speaking NPC
- [x] `GeneratedNpc.raceKey` is required when `canSpeak` is true and omitted when false, exactly mirroring today's `alignment`/`backstory` gating (`hasValidNpcRace`, `isGeneratedNpc`)
- [x] All persistence call sites (`persistRegionWithNpcs`, `persistCampaignNpcsFromGeneration`, `generateNpcForCampaign`) resolve-or-realize the chosen race before creating the NPC row, so a persisted NPC never references an un-realized key
- [x] `Npc.raceKey` is null for non-speaking NPCs and always set for speaking ones going forward
- [x] Unit tests cover: prompt includes available races, normalize accepts/rejects race per `canSpeak`, and persistence realizes-or-reuses correctly (including reusing a race a player already locked in)

### 049.10 NPC promotion carries race forward

Depends on: 049.9

#### Description
`confirmNpcPromotion` (`src/main/promotionIpc.ts`) already copies `alignment`, `temperament`, and `disposition` from the source NPC onto the new `ai_party_member` character. Add `race_key` to that same copy — no regeneration, no lore step.

#### Acceptance Criteria
- [x] `confirmNpcPromotion` sets the new character's `race_key` to the source NPC's `raceKey` unchanged
- [x] A pre-epic NPC with no race (`raceKey: null`) promotes cleanly to a race-less party member (no error)
- [x] Unit test covers race carrying forward through promotion

### 049.11 Feed full character context (name, race, alignment) into identity/opening-scene

Depends on: 049.4

#### Description
On the final "talking with the DM" screens, the DM must have the **complete** character identity. Today `IdentityInterviewContext` and both `buildIdentityKickoffPrompt()` and `buildIdentityInterviewPrompt()` already carry `name`, `class`, `abilityScores`, and `alignment`; this ticket adds the locked **race name + finalized lore** (resolved via `getCampaignRaceByKey(db, campaignId, character.raceKey)`) to that same "Mechanical character" identity block so the DM sees name + race + alignment (plus archetype/abilities) as established fact — and does the same for the opening-scene agent. The interview should build on the established race rather than re-eliciting lineage from scratch.

#### Acceptance Criteria
- [x] `IdentityInterviewContext` includes race name + lore, resolved via `getCampaignRaceByKey` and wired from the persisted character in `guidedCreationIpc.ts`
- [x] Both `buildIdentityKickoffPrompt` and `buildIdentityInterviewPrompt` include the full identity block — name, race, alignment, archetype, ability scores — and reference race/lore as established fact (like alignment), not something to re-ask or overwrite
- [x] Opening-scene agent context also receives the full identity including race name/lore
- [x] Race/lore (and premise/world summary) are passed as untrusted narrative content, not instructions
- [x] Unit tests assert name, race, and alignment all appear in the assembled kickoff, interview-turn, and opening-scene prompts

### 049.12 Character sheet shows race

Depends on: 049.4

#### Description
Surface the chosen race on the character sheet (and any character summary/cast rail where archetype/name already appear), reading from the persisted race field.

#### Acceptance Criteria
- [x] Character sheet displays the chosen race name near name/archetype
- [x] Value reads from persisted `race_key`, resolved to a label via the campaign's catalog (falling back to the predefined roster label if not yet in the catalog); custom races show their catalog `label`
- [x] Characters created before this epic (no race) render gracefully without errors
- [x] Renderer test covers race display and the no-race fallback

### 049.13 Race selection back navigation

Depends on: 049.6

#### Description
Add a **Back** control on the race selection page that returns the player to character setup without persisting a race or advancing guided-creation phase, reusing the equipment-selection back pattern (047.11 / 047.12) so setup details are preserved.

#### Acceptance Criteria
- [x] Back button visible on race selection (loading, generating, locked-reuse, error, and main form states)
- [x] Back navigates onboarding stage to `characterSetup` and preserves entered setup details
- [x] Back does not persist a race or advance phase (safe because `race:apply` is the only persistence point and Back never calls it)
- [x] Renderer test verifies Back invokes `onBack`

### 049.14 Smoke test + runbook update

Depends on: 049.1–049.13

#### Description
Add `docs/runbooks/race-selection-smoke-test.md` and focused DB/agent integration tests covering the full catalog lifecycle: first realization, locked reuse, custom minting, and NPC generation picking a player-minted custom race.

#### Acceptance Criteria
- [x] Integration test: a first character in a campaign picks "Elf" (realizes + locks lore); a second character later picks "Elf" and receives the identical locked lore read-only (no second LLM call)
- [x] Integration test: a player mints a custom race, then a subsequent NPC-generation call is able to select that custom race by key
- [x] Integration test: an AI party member's race realizes a predefined race that the protagonist later also selects (read-only reuse)
- [x] Runbook (`docs/runbooks/race-selection-smoke-test.md`) steps: character setup (including a party member race) → race (predefined, editable lore) → equipment → identity → verify race on sheet
- [x] Runbook documents the custom-race seed → generate → edit flow, the locked/reused-on-second-pick behavior, and mid-race app restart resuming on the race page
- [x] `npm test`, `npm run lint`, and `npm run build` pass
