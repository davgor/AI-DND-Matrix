# Campaign bestiary — species, variants, composition, generation points

Contract for engine, DB, agents, campaign create, quests, and combat. Enemies are **bestiary entries** (species + variants), not one-off villager placeholders. Agents may propose fiction names, lore, and composition hints; they **never** emit HP, AC, attack bonus, or damage.

Builds on catalog retrieve-first (023), creature hydration (031.3 / 042), flagged NPCs (052), quest proposals, log-book `beast` (025), and demotes ticket 115 provisional villager spawn to last resort.

## Core model

| Concept | Meaning |
|---------|---------|
| **Species** (`BestiarySpecies`) | Campaign-scoped bestiary entry (e.g. “Rift-beast”). Holds `key`, display `name`, immutable `baseLore` (1–2 paragraphs), optional `visualAppearance` (structured silhouette/colors/marks for creature tokens; null on legacy rows), `buckets` / `tags`, and `defaultCatalogKey` for mechanical template lookup. |
| **Variant** (`BestiaryVariant`) | Named mutation of a species (`standard`, `alpha`, …). May set `catalogKeyOverride` and/or `modifierProfileId` (engine-owned profile table — not free LLM numbers). Optional `flavorBlurb` for narration only. |
| **Instance** (`BestiaryInstanceRef`) | Concrete `npcs` row in a region (or staged for a quest), linked via `speciesId` + `variantKey`, with fiction `displayName`. |
| **Composition plan** (`CompositionPlan`) | Engine-owned encounter mix: slots of `{ speciesKey, variantKey, count }` within `budgetSpent` ≤ `budgetMax`. |
| **Spawn outcome** (`SpawnOutcome`) | Result of materializing instances: `success`, `fallback_provisional` (115 last resort), or `failed`. |

Shared DTOs live in `src/shared/bestiary/types.ts`. Persistence shapes land in 116.2; this module is the cross-layer contract only.

## Three generation points

```
1. PREPPED (`prepped`) — campaign create
   Premise / setting → seed roster → persist species (+ lore, catalog link, default variants)

2. ON QUEST (`on_quest`) — propose and/or accept
   Quest text → resolve to species (reuse first) → generate missing → attach assignment / planned composition

3. ON DEMAND (`on_demand`) — empty hostile startEncounter
   Unexpected hostility → composition plan → reuse species else generate → spawn instances
```

Const: `BESTIARY_GENERATION_POINTS = ['prepped', 'on_quest', 'on_demand']`.

**Bestiary-first:** on-quest and on-demand prefer existing campaign species before inventing new ones.

## Encounter start precedence

Generation points seed the bestiary; **combat start** resolves participants in this order (`ENCOUNTER_START_PRECEDENCE`):

1. `explicit_participants` — caller-supplied `participantNpcIds`
2. `quest_prep` — quest-prepared instances or composition for the active quest in this region
3. `region_hostiles` — existing hostile NPCs already in the region
4. `on_demand` — 116.8 composition + spawn

Quest-driven fights should open with pregenerated foes for round-1 roleplay. On-demand generation must not run when an earlier step already supplies participants.

## Variant vocabulary

| Key | Role | Notes |
|-----|------|-------|
| `standard` | Base template | Default catalog key on the species |
| `alpha` | Elevated pack leader | Prefer when pack size ≥ ~4; synonym-ish with `elite` for packs |
| `elite` | Elevated singleton | Tougher single without implying a pack |
| `cursed` | Thematic blight/curse | Prefer when region/scene signals blight |
| `mutated` | Thematic rift/mutation | Prefer when rift/warp signals; interchangeable with `cursed` for blighted land when tags match |
| `pack_runt` | Weaker pack filler | Optional budget filler; never invents custom dice |

Agents pick variant **keys** only. Stat mapping is catalog key + documented engine modifier profile (116.4).

## Encounter budget + composition (worked examples)

Engine owns budget from player level + party size. Planner outputs a `CompositionPlan` with non-empty `slots` and `budgetSpent ≤ budgetMax`.

### Alpha pack (level ~5 wolf ambush)

```json
{
  "slots": [
    { "speciesKey": "wolf", "variantKey": "standard", "count": 5 },
    { "speciesKey": "wolf", "variantKey": "alpha", "count": 1 }
  ],
  "budgetSpent": 8,
  "budgetMax": 10,
  "thematicSignal": "road_ambush"
}
```

Multiple `standard` + one elevated `alpha` within clamp.

### Cursed pack (blighted land)

```json
{
  "slots": [
    { "speciesKey": "wolf", "variantKey": "cursed", "count": 3 }
  ],
  "budgetSpent": 9,
  "budgetMax": 10,
  "thematicSignal": "blighted_land"
}
```

Fewer thematic variants instead of a larger normal pack. Composition may be rules-first (budget + tags) with optional thin LLM flavor for names/lore only — **never** for HP/AC/damage.

## Lore vs discovered facts

| Field | Who writes | Mutable? | Purpose |
|-------|------------|----------|---------|
| `baseLore` | Species generation / preset seed | **Immutable** after create | Grounding for DM/agents (1–2 paragraphs) |
| Discovered facts | DM side-effects after combat / observe / study | Append-only | Player-facing knowledge that grows with play |

### Persistence (116.3)

| Concern | API / store |
|---------|-------------|
| Non-empty base lore on create | `assertNonEmptyBaseLore` → enforced by `createBestiarySpecies` (trim; throw if empty). There is **no** `updateBestiaryBaseLore` in v1. |
| Append discovered fact | `appendBestiaryDiscoveredFact(db, { campaignId, characterId, speciesId, title, content, relatedNpcId? })` |
| List discovered facts | `listBestiaryDiscoveredFacts(db, { characterId, speciesId })` |
| DM / context assembly | `getBestiarySpeciesGrounding(db, speciesId, characterId?)` → `{ baseLore, discoveredFacts }` (read-only; never mutates `base_lore`) |

**Player-facing store:** log-book entries with `category: 'beast'` and `relatedEntityId = species.id` (species-level knowledge). Prefer species id over instance npc id when the fact is about the species.

**Optional `relatedNpcId`:** recorded in the entry **content** as `[instanceNpcId=<id>]` for instance provenance. Does **not** create a second log entry and does **not** change `relatedEntityId` (stays species id so lists/grounding stay species-scoped).

Agents **may append** discovered facts via `appendBestiaryDiscoveredFact` (or equivalent log-book `beast` writes). Agents **must not** rewrite or contradict `baseLore`.

## Catalog / engine authority for combat numbers

**Hard rule:** agents never emit HP, AC, attack bonus, or damage dice.

Mechanical resolution order (aligned with `npcCombat` SPEC):

1. **Catalog retrieve-first** — `defaultCatalogKey` / variant `catalogKeyOverride` → hydration (031.3 / 042)
2. **Documented modifier profiles** — engine tables keyed by `modifierProfileId` (116.4)
3. **Villager provisional** — last resort only (`SpawnOutcome.kind === 'fallback_provisional'`), demoting ticket 115

Fiction display names (“Rift-wolf”) may differ from catalog keys (`dire-wolf`). Variants select **which template + count** within budget; they do not invent numbers.

## Mapping to existing systems

| Existing piece | Bestiary mapping |
|----------------|------------------|
| `npcs` rows | Instances; optional `bestiary_species_id` / `bestiary_variant_key` (116.2) |
| `catalog_creature_key` | Species `defaultCatalogKey` or variant override; combat tier `catalog` |
| Log-book `beast` | Player-facing discovered facts via `appendBestiaryDiscoveredFact` / `listBestiaryDiscoveredFacts`; `relatedEntityId` → species id (instance npc id only as content provenance) |
| Quest proposals / quests | Foe assignment + optional planned `CompositionPlan` JSON (116.7) |
| Campaign create stages | `prepped` generation point seeds roster (116.6) |
| `startEncounter` empty path | Precedence → on-demand spawn (116.8 / 116.9) |

## Out of scope / deferred

- Schema/repos (116.2), lore write path (116.3), composition planner implementation (116.4), species pipeline (116.5), create stage (116.6), quest wiring (116.7), spawn/combat wiring (116.8–116.10) — covered by later 116.x tickets (historical 116.1 note).
- **Campaign Review bestiary panel (116.11)** — **shipped** in epic **126.6**. Review lists prepped species (name, base lore, variants) read-only and hides when the roster is empty.

## LLM efficiency ceilings

See [`docs/runbooks/bestiary-efficiency.md`](../../../docs/runbooks/bestiary-efficiency.md) for call budgets per generation point (`prepped` / `on_quest` / `on_demand`) and composition (0 LLM).
