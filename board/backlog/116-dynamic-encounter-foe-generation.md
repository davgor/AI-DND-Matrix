# EPIC: Campaign bestiary — foes, lore, variants, and three generation points

Enemies should feel like **bestiary entries**, not one-off villager placeholders. Today (ticket **115**) empty `startEncounter` spawns a provisional hostile with a regex name and villager stats. Catalog hydration (031.3 / 023), flagged NPCs (052), quest proposals (`questProposals` in DM narration), and log-book **beast** entries already exist in pieces — this epic unifies them into a durable foe system.

## Player fantasy

- Campaign starts with setting-appropriate threats already known to the world (Shield Hero → slimes, rift-beasts).
- Accepting a quest pre-assigns (and generates if missing) the foes you will meet, so combat opens with named, roleplay-ready enemies.
- Wandering into unexpected hostility can still generate foes on demand.
- Each foe species starts with **1–2 paragraphs of lore**; as the player fights and studies them, the DM adds **persistent discoverable facts** (bestiary knowledge), not disposable flavor.
- Encounters use **variants** of a species to fit scene, setting, and power level (e.g. five wolves + one alpha; or three cursed/mutated wolves in a blighted land).

## Three generation points

```
1. PREPPED (campaign create — new stage)
   World/setting premise → bestiary seed list
   Preset worlds (Shield Hero, etc.): pull signature foes (slimes, rift-beasts, …)
   Generative worlds: invent a small roster consistent with regions/premise
        │
        ▼
   Persist campaign bestiary species (+ base lore, catalog link, default variants)

2. ON QUEST (propose and/or accept)
   Quest text describes threats → resolve to bestiary species
   Missing species → generate into bestiary (same pipeline as create)
   Attach foe species / planned composition to the quest for later encounter start
        │
        ▼
   Combat can open with pregenerated participants (dynamic roleplay at round 1)

3. ON DEMAND (exploration / empty startEncounter)
   Unexpected hostility, no quest prep, no region hostiles
        │
        ▼
   Propose composition → reuse existing bestiary species when possible
   else generate new species → spawn instance NPCs (variants as needed)
```

Agents **never** invent HP/AC/damage. Mechanical templates come from catalog retrieve-first (023) + hydration (031.3 / 042). Lore and discovered facts are narrative; variants select or mutate **which template + count** within an engine-owned encounter budget.

Builds on: **031**, **023**, **032**, **042**, **052**, **115**, quest narration (`questNarration` / `createQuest`), campaign create stages (`CreateCampaignStage`), log book `beast` category.

**Campaign-create changes** must follow `docs/runbooks/campaign-create-change-checklist.md` (new stage, fixtures, contract tests, one manual create).

Broken down into sub-tickets **116.1–116.12**. Done when all required tickets are complete (116.11 may be explicitly deferred) and verification gates pass.

## Core model (bestiary)

| Concept | Meaning |
|---------|---------|
| **Species** | Campaign-scoped bestiary entry (e.g. “Rift-beast”, “Blue slime”). Has base lore, catalog key or generation recipe, tags/buckets. |
| **Variant** | Named mutation of a species for balance/theme (e.g. `standard`, `alpha`, `cursed`, `pack_runt`). Points at catalog key and/or stat-tier modifiers documented in engine — not free LLM numbers. |
| **Instance** | Concrete `npcs` row in a region (or staged for a quest encounter), linked to `speciesId` + `variantKey`, with fiction display name. |
| **Lore (base)** | 1–2 paragraphs authored at species creation; immutable grounding for DM/agents. |
| **Discovered facts** | Player-facing persistent knowledge that grows over encounters (prefer log-book `beast` entries + `relatedEntityId`, and/or a dedicated bestiary-knowledge table if log book is insufficient). |

## Encounter composition (variants in practice)

Engine owns a **budget** from player level + party size. A **composition plan** picks species + variant mix within that budget:

| Scene | Example plan |
|-------|----------------|
| Level 1 road ambush | 2× `rift-beast` / `standard` |
| Level 5 wolf pack | 5× `wolf` / `standard` + 1× `wolf` / `alpha` |
| Cursed land | 3× `wolf` / `cursed` (mutated) instead of a larger normal pack |

Composition may be chosen rules-first (budget + tags) with optional thin LLM flavor for names/lore only.

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Bestiary-first.** On-demand and quest paths prefer existing campaign species before inventing new ones. |
| 2 | **Retrieve-first stats.** Catalog hydration for combat numbers; villager only as last resort. |
| 3 | **Persist everything.** Species, variants, instances, and discovered facts survive restart and are recallable. |
| 4 | **Fiction names over templates.** Display “Rift-wolf” while `catalog_creature_key` may be `dire-wolf`. |
| 5 | **Quest prep enables round-1 roleplay.** Quests carry foe assignments so combat start does not cold-generate when prep exists. |
| 6 | **Setting-aware campaign seed.** Preset/known premises contribute signature foes; open prompts contribute a small coherent roster. |
| 7 | **Lore grows with play.** Base lore at generation; new persistent facts as the player learns (combat, observation, study) — not rewriting base lore. |
| 8 | **115 provisional demoted.** Villager-only nameless spawn is last resort after this epic. |

## Definition of done

- Shared bestiary types: species, variant, composition plan, generation point, spawn outcome
- Schema + repos for campaign bestiary (and quest↔foe links)
- Base lore (1–2 paragraphs) on every generated species; discovered-facts path wired
- Variant catalog (at least `standard` + one elevated + one thematic mutation pattern) with engine-safe stat mapping
- **Prepped:** new campaign-create stage seeds bestiary (setting-aware)
- **On quest:** propose/accept assigns foes; generates missing species
- **On demand:** empty hostile start uses bestiary + composition (not bare 115 provisional)
- Smoke covering all three generation points + variant pack example
- Campaign-create checklist + efficiency ceilings documented

116.1 spec + types · 116.2 schema + repos · 116.3 lore + discovered facts · 116.4 variants + composition budget · 116.5 species generate pipeline (retrieve-first) · 116.6 campaign-create bestiary stage · 116.7 quest foe assignment · 116.8 on-demand encounter spawn · 116.9 combat start prefers quest/region/bestiary · 116.10 intent/presentNpcs/HUD recall · 116.11 (optional) Campaign Review bestiary panel · 116.12 smoke + efficiency + create checklist

## Sub-tickets

### 116.1 Spec + shared types (bestiary, variants, generation points)

#### Description
Document the bestiary contract under `/shared` (e.g. `/shared/bestiary`) for engine, DB, agents, create pipeline, quests, and combat.

Cover:
- Species / variant / instance / composition plan / spawn outcome shapes
- The three generation points and precedence: quest prep → region hostiles/instances → on-demand generate
- Encounter budget + variant mix rules (worked examples: alpha pack, cursed pack)
- Lore vs discovered facts (what agents may append)
- Agents never emit HP/AC/damage
- Mapping to existing `npcs`, catalog keys, log-book `beast`

#### Acceptance criteria

- [ ] Spec documents model, three generation points, precedence, and variant examples
- [ ] Shared types/guards export with unit tests
- [ ] Spec states catalog/engine authority for combat numbers

### 116.2 Schema + repositories (species, variants, quest links)

#### Description
Add forward-only migration and repositories for campaign-scoped bestiary storage:
- species rows: campaign id, key/name, base lore, buckets/tags, default catalog key, timestamps
- variant rows (or JSON on species): variant key, catalog key override, documented modifier profile id, flavor blurb
- optional instance link fields on `npcs` (`bestiary_species_id`, `bestiary_variant_key`) if not derivable otherwise
- quest↔foe assignment (quest id → species ids and/or planned composition JSON)

Cascade on campaign delete. Keep migrations compatible with existing campaigns (empty bestiary until seeded).

#### Acceptance criteria

- [ ] Migration + repo CRUD round-trips species, variants, and quest foe assignments
- [ ] `deleteCampaign` cleans bestiary + links
- [ ] Unit tests cover persistence and cascade

### 116.3 Base lore + discovered facts (bestiary knowledge)

#### Description
At species creation, generate/persist **1–2 paragraphs** of base lore (LLM allowed here; not combat stats). As the player encounters the foe, append **discovered facts** that persist and can ground later narration / log-book `beast` entries (`relatedEntityId` toward species or instance).

Define when facts are written (e.g. after combat round, observe action, explicit study) — rules-first triggers + DM structured side-effect, not silent lore overwrite.

#### Acceptance criteria

- [ ] New species always have non-empty base lore (generation or seeded preset text)
- [ ] Discovered-fact path persists and is readable for DM/context assembly
- [ ] Base lore is not clobbered when facts are added (tests)
- [ ] Log-book `beast` integration documented and tested if used as the player-facing store

### 116.4 Variants + encounter composition budget

#### Description
Engine-owned budget from player level + party size. Composition planner outputs a list of `{ speciesKey, variantKey, count }` within clamp.

Ship an initial variant vocabulary (extensible):
- `standard` — base catalog template
- `alpha` / `elite` — tougher single (higher catalog tier or documented profile)
- `cursed` / `mutated` — thematic variant (tags + catalog/profile); used when region/scene signals blight/curse/rift

Pure functions in `/engine` or testable main helpers — no LLM for numbers.

#### Acceptance criteria

- [ ] Unit tests: level-5 wolf pack → multiple `standard` + one `alpha` within budget
- [ ] Unit tests: cursed-land signal → prefers `cursed` mix over larger normal pack
- [ ] Budget clamps always enforced

### 116.5 Species generate pipeline (retrieve-first + lore)

#### Description
Single pipeline used by all three generation points:
1. Normalize proposal (name, buckets, tags, setting hints)
2. `retrieveCreatures` for mechanical template
3. Persist species + default variants + base lore (LLM for lore only when not preset)
4. Return species id for instance spawning

Reuse flagged/non-speaker patterns where useful; do not invent stats.

#### Acceptance criteria

- [ ] Pipeline creates species with catalog key when retrieval matches
- [ ] Lore present; combat stats only via hydration on instances
- [ ] Dedup: same campaign + canonical key/name does not duplicate species (tests)

### 116.6 Campaign create — prepped bestiary stage

#### Description
Add a **bestiary** (or `foes`) stage to `CreateCampaignStage` after world/regions (exact order documented — likely after `regions`/`npcs` or after `story`, before `persist`). Generate or seed a small roster from premise/setting.

Preset-aware: known premises (e.g. Shield Hero / rift fantasy) must include signature foes (slimes, rift-beasts) via seed map or retrieval tags — not only generic wolves.

Follow **campaign-create-change-checklist**: stage messages, normalize, fixtures, `campaignCreateIpc.contract.test.ts`, progress UI string.

#### Acceptance criteria

- [ ] New stage appears in create progress and `CREATE_CAMPAIGN_STAGE_ORDER`
- [ ] Created campaign has ≥N bestiary species (N documented) with lore
- [ ] Preset/signature premise fixture includes expected foe tags/names
- [ ] Contract + generation tests updated; checklist items done for this stage

### 116.7 Quest foe assignment (propose / accept)

#### Description
When a quest is proposed (DM `questProposals` persist) and/or accepted/created for a character, resolve described enemies to bestiary species:
- match existing campaign species by name/tags
- if missing, run 116.5 to generate
- store assignment + optional planned composition on the quest

Prefer assignment at **persist** of the proposal so prep exists before the player walks into the ambush; document if accept-time is also required for player-created quests.

#### Acceptance criteria

- [ ] Quest with “clear the rift-beasts” ends with foe assignment rows pointing at species ids
- [ ] Missing species are generated into the campaign bestiary
- [ ] Integration test: propose → assignment present without starting combat
- [ ] Existing quest FK hardening (111) remains intact

### 116.8 On-demand encounter spawn

#### Description
Replace 115’s villager provisional path: when `startEncounter` has no participants, build a composition (116.4) from input/scene, resolve species (reuse bestiary → else 116.5), spawn **instances** as region NPCs with variant keys, then start encounter.

#### Acceptance criteria

- [ ] Empty-region `startEncounter` yields active combat with catalog-tier stats when retrieval matches
- [ ] Prefers existing bestiary species over inventing duplicates
- [ ] 115 tests updated; provisional villager only if catalog + generation both unavailable

### 116.9 Combat start prefers quest / region / bestiary prep

#### Description
Wire precedence into combat orchestration:
1. Explicit `participantNpcIds`
2. Quest-prepared instances or composition for the active quest in this region (if any)
3. Existing hostile NPCs in region
4. On-demand 116.8

Goal: quest-driven fights start with **pregenerated** foes for immediate roleplay (names, lore-aware narration hooks).

#### Acceptance criteria

- [ ] With quest foe prep present, combat start does not call on-demand species generation (test with call counters)
- [ ] Prepared instances appear in initiative/HUD on turn 1
- [ ] Precedence tests for all four layers

### 116.10 Intent, presentNpcs, and recall

#### Description
Spawned/prepared foes appear in intent/narration context. Guidance: attack existing hostiles; avoid redundant `startEncounter`. Discovered facts / species lore available for slim DM context when those foes are present.

#### Acceptance criteria

- [ ] Follow-up `attack` with `targetNpcId` works on prepared/on-demand instances
- [ ] Present-NPC lists include instances; lore/facts available to context assembly (tested)
- [ ] No double-spawn when hostiles already exist

### 116.11 Optional: Campaign Review bestiary panel

#### Description
**Stretch.** Read-only (or light edit) Campaign Review section listing species, base lore, variants. Defer if it blocks mechanical delivery — mark deferred explicitly.

#### Acceptance criteria

- [ ] Implemented with basic list UI **or** explicitly deferred with rationale

### 116.12 Smoke, efficiency ceilings, create checklist close-out

#### Description
End-to-end coverage:
1. **Prepped** — create campaign (scripted) → bestiary species exist
2. **On quest** — propose quest → foes assigned → start combat uses prep
3. **On demand** — empty region engage → composition + instances
4. **Variants** — scripted level-5 wolf-pack composition includes alpha (or cursed pack)

Document LLM ceilings: composition/budget rules-first (0 calls); lore/species generation budgets per create stage and per quest; on-demand lore only when new species required.

Finish campaign-create checklist including one manual create with a real provider when 116.6 lands.

#### Acceptance criteria

- [ ] Smoke/integration tests cover all three generation points + one variant mix
- [ ] Efficiency assertions for happy paths documented in tests
- [ ] `npm test`, lint, build, deadcode, `act` pr-checks + deadcode pass
- [ ] Campaign-create checklist completed for bestiary stage
