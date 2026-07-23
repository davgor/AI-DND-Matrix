# EPIC: World grid — spatial data model for persistent world locations

Build a **campaign-scoped square world grid**: a durable spatial index that maps locations to datapoints (terrain, biome, climate, factions, quests, settlements, NPC positions) so the DM and other agents can be grounded from **where the party is**, not only from free-text regions.

This is a **data model first**. No player-facing map UI and no pixel-sprite traversable world (**m004**) in this epic. The grid is an experiment that can later feed more game-like movement, combat staging, and a future **2D visual layer** — but v1 only needs persistable overlay data, deterministic terrain, agent read of **one cell**, and DM write/move APIs.

Three things this epic is explicitly building toward, beyond "ground the current DM turn":

- **Data layer for a future game.** This grid is meant to be the map a later game assigns 2D visual elements (tiles/sprites) onto — v1 does not render anything, but the cell digest schema must reserve an extension point so that layer doesn't require a schema migration to bolt on.
- **A map that updates dynamically during play**, not just at generation time — DM writes, entity moves, and on-demand content minting all mutate it after campaign create.
- **A locked source of truth that resists LLM hallucination.** Narration reads grid digests; it never writes them. Every mutation goes through a validated engine/DM API (write, move, mint) — free-form LLM output cannot become permanent grid truth except by passing through one of those APIs as a structured patch.

Builds on **054** / **057** (world + regions), **038** (travel / `currentRegionId`), existing NPC + region repos. Complements **125** (factions), **130** (hard world mutations), **134** (live population), **135** (travel intents), **141** (play-time place mint — the mechanism this epic's "exploration" behavior reuses). Distinct from **m004** (sprite multi-map play shell), which is a future *consumer* of this data, not built here.

## Product stance (locked from design Q&A)

| Question | Locked stance |
|----------|---------------|
| Data vs UI? | **Data model + locate APIs.** Optional schematic debug UI later; not required for epic done. |
| Regions vs cells? | **Regions span thousands of cells.** Cell ≈ house footprint; region ≈ country. Regions remain first-class campaign entities; the grid is the spatial substrate under them. |
| Topology? | **Square grid.** |
| Terrain storage? | **Deterministic pure function** `(worldSeed, x, y) → { elevation, biome, climate }`, evaluated on read — never bulk-inserted or materialized. Only the world seed/params, sparse overlays, entity positions, and DM notes are persisted rows. This removes the "millions of fat rows" problem by construction instead of requiring a custom packed/chunked binary encoding. |
| Scale? | **Effectively unbounded coordinate space** (millions+ of addressable cells) since terrain costs nothing to evaluate at any coordinate. Curated overlay content (regions, factions, settlements, quests, DM notes) stays small in row count — hundreds to low thousands per campaign, not millions. |
| When generated? | **Overlay placement runs after campaign persist** (async/staged job fine); world/region/NPC/faction outputs seed overlay footprints. Terrain itself needs **no generation step** — it's addressable everywhere the instant a world seed exists. Curated detail grows afterward via DM writes and on-demand content minting (see "Exploration" row). |
| Agent context? | Agents pull **one cell** only. Multi-cell phenomena (biome bands, faction territory, quest zones) are resolved by **footprint-containment check at read time** by default; only materialize a feature into per-cell rows if read-time containment proves too expensive for that specific feature. |
| Authority / hallucination protection? | **Grid feeds the LLM, and only the LLM reads it.** Narration/NPC context is grounded from cell digests; the LLM never writes digests. All truth-changing writes go through validated DM/engine APIs (`writeCellContext`, move APIs, content-mint APIs) — LLM output can only enter the grid as a structured patch produced by one of those APIs, never as free text appended directly. |
| Travel? | **Cell-to-cell.** Canonical cell size **60 ft × 60 ft**. DM/engine may advance the player **multiple cells in one action** (day's travel, teleport, escort). |
| NPC location? | NPCs have a **grid cell coordinate** (and can move). Example: "I'll meet you in X city" → DM/engine API relocates the NPC to a cell inside that settlement. |
| Exploration beyond seeded content? | **No grid/extent expansion mechanism** — coordinates are addressable everywhere from the start, so there's no frontier to grow. "Expansion" means: when the party's current cell has no overlay coverage, that's the trigger condition for the **existing on-demand content-mint path** (epic **134** for NPCs, epic **141** for places), tagging newly minted content with a footprint the same way campaign-launch content is tagged. Not a new subsystem. |
| Visual layer (future)? | **Out of scope to render** in this epic, but the cell digest schema reserves an optional tile/visual reference field so a future 2D visual layer can map cells to art without a later migration. This epic does not choose the art pipeline. |
| vs m004? | **Not** the sprite traversable world. May seed m004 (and the future 2D visual layer generally) later; this epic is narrative-campaign persistent spatial data only. |

## Target flow

```
Campaign create (existing)
  premise → world → regions → factions → NPCs → story → persist

World-grid setup (NEW; post-create)
  persist world seed + generation params (one row — terrain needs no bulk generation)
    → place campaign regions as footprints, biased to match each region's already-authored
      biome/climate (from 054/057 prose) rather than searching the noise field for a match
    → stamp faction territories, quest zones, village footprints within/near region footprints
    → place NPCs on cells (settlement-biased)
    → persist sparse overlays + entity positions only (terrain stays a pure function of seed+coords)

Play
  character.currentCell (x, y)  [and keep region id in sync when cell∈region]
    → assembleDmContext reads THAT cell only: evaluate terrain function + overlay lookup +
      dm notes → self-contained digest
    → cell has no overlay coverage? → route into the existing on-demand content-mint path
      (134/141) instead of a new expansion mechanism; result tagged with a footprint
    → travel intent → engine moves N cells (60 ft each) + optional region update
    → DM APIs: writeCellContext / moveNpcToCell / moveCharacterCells — the only paths that
      create new permanent grid truth
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **First-class world grid** per campaign: world seed, origin, cell size constant (`CELL_SIZE_FT = 60`). The coordinate space is unbounded/addressable by construction — there is no "extent" row to allocate or grow. |
| 2 | **Terrain is never bulk-inserted.** It is a deterministic pure function `(worldSeed, x, y) → { elevation, biome, climate }` evaluated on read. Storage holds only: world seed/params, sparse overlays (regions/factions/settlements/quests/DM notes), and entity positions. |
| 3 | **Overlay placement runs after campaign persist** (async or staged job is fine). Campaign entities seed named places, faction territories, and NPC starts as footprints in the coordinate space. |
| 4 | **No generation step for terrain.** Full coordinate space is addressable from the moment a world seed exists. Curated overlay detail is seeded from campaign content at create time and grows afterward only via DM writes (decision 10) and on-demand content minting (decision 14) — never via a direct LLM write to grid truth. |
| 5 | **Cell digest (v1 fields)** at least: `terrain`, `biome`, `climate`, `factionIds` / faction digest, `questInfo` (hooks/ids), region membership/digest, settlement label if any, `dmNotes` (permanent DM-written context), and a reserved-but-unused `visualRef` field for the future 2D visual layer (decision 13). SPEC finalizes schema. |
| 6 | **Multi-cell features** (rivers, biomes, faction borders, quest areas) cover ranges; each cell in range exposes the feature in its digest via read-time footprint-containment check. |
| 7 | **Entity positions:** player character(s) and NPCs store `(cellX, cellY)` (and optionally sub-cell later — out of scope). Moving an NPC is an engine API, not chat-memory. |
| 8 | **Travel:** engine-owned position updates by cell delta or destination cell; multi-cell moves allowed in one call; day/time clamps remain engine-owned (**135** sibling). When a move crosses region overlays, update `currentRegionId` consistently. |
| 9 | **Agent grounding:** narration/NPC context assembly injects **only the active cell digest** (budgeted). No neighborhood dump in v1. |
| 10 | **DM write API:** append/upsert permanent cell context (`dmNotes` / structured patches) that survives restart and is preferred in digests. This is the **only** path by which DM-authored narrative detail becomes permanent grid truth — LLM narration output must be translated into a structured write by engine code, never appended directly. |
| 11 | **No player map UI required** for epic completion; repo/IPC/tests are enough. Dev-only inspection helpers optional. |
| 12 | **Campaign create checklist** applies to any create-pipeline hook that kicks off world-grid setup. |
| 13 | **Region/overlay placement matching:** when stamping a campaign-launch region's footprint, the region's already-authored biome/climate (from 054/057) takes precedence over the terrain function's rolled value inside that footprint; raw terrain only governs wilderness outside curated footprints. (Searching the terrain function for a matching location was considered and rejected — adds complexity with no guaranteed match.) |
| 14 | **Exploration/expansion:** no dynamic grid growth. When play moves the party into a cell with no overlay coverage, that is the trigger condition for the existing on-demand content-mint path (**134**/**141**), not a new grid-expansion system. |

## Definition of done

- World-grid setup persists a world seed + campaign-seeded overlays; arbitrary in-extent coordinates are queryable via the deterministic terrain function (no bulk-row generation, no packed/chunked storage engineering)
- Campaign-seeded regions/settlements/NPCs appear at coherent coordinates, matching their authored biome/climate where footprints are placed
- Character + NPC positions are cell-based; move APIs work and persist
- DM can write permanent cell context; agents see it on next turn from the single-cell read
- Travel can move multiple 60 ft cells in one engine call, keeps region membership coherent, and routes uncovered cells into the existing on-demand content-mint path
- LLM narration cannot write grid truth directly — only structured engine/DM writes do (tested)
- Cell digest schema includes the reserved (unused) `visualRef` field for a future 2D visual layer, so that layer needs no later migration
- Storage/terrain-function strategy documented and tested at representative scale (determinism + read-path performance tests; no full million-row insert, because nothing is bulk-inserted)
- Delivery gate: tests, lint, build, deadcode, `act`

143.1 SPEC + types · 143.2 Storage/schema (sparse overlays + terrain function) · 143.3 Overlay placement + campaign seed · 143.4 Entity positions + move APIs · 143.5 DM cell write API · 143.6 Agent single-cell grounding · 143.7 Travel multi-cell engine path + on-demand expansion hook · 143.8 Tests + scale fixture + smoke notes

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **054** / **057** | World + regions seed grid overlays; authored biome/climate wins inside a region's footprint (decision 13) |
| **125** | Faction territories stamp cells; reputation stays on **125** tables |
| **130** | Place destruction may later patch cell/region overlays; not required in 143 v1 beyond leaving extension points in SPEC |
| **134** | On-demand NPCs should receive a cell when minted; **also the mechanism "exploration" reuses** (decision 14) when the party enters an uncovered cell |
| **135** | Travel intents should eventually resolve to cell moves; 143 supplies the position model |
| **038** | Hub region display remains; grid is under the hood |
| **141** | Play-time place mint is the other half of the on-demand content-mint path that "exploration" routes into (decision 14) |
| **m004** | Future consumer of coordinates/placements; **out of scope** here. The reserved `visualRef` digest field (decision 5) exists so this and a future 2D visual layer don't need a schema migration to attach |

## Out of scope (v1)

- Player-visible world map / fog of war UI
- Pixel-sprite maps, walkability, collision (**m004**)
- Hex grids or continuous coordinates
- Agent neighborhood / multi-cell context windows
- Real-time weather simulation ticks
- Sub-cell (ft-within-cell) positioning
- Multiplayer shared grid sync (**m002** / **m005**)
- Replacing the existing region list UX
- Bulk terrain materialization / packed binary chunk encoding (superseded by the deterministic terrain function — decision 2)
- Building the future 2D visual/rendering layer itself (only a reserved schema field, decision 5)
- Any dynamic grid/extent-growth mechanism (superseded by decision 14's on-demand content-mint routing)

## Open implementation notes (SPEC must resolve)

- Terrain function composition: elevation → moisture/climate → biome derivation (e.g. Whittaker-diagram-style thresholds) and the exact seed formula
- Footprint shape for overlays (centroid + radius vs polygon) and containment-check performance at representative overlay counts
- Whether region history text is inlined into every cell digest or referenced by `regionId` with a short stamp (read API still returns one payload)
- Shape of the reserved `visualRef` field (opaque string id vs enum) so it's genuinely migration-free for a future consumer
- Job UX: blocking create vs background "world grid generating…" on hub
- Coordinate system: origin, axial direction, serialization

## Sub-tickets

### 143.1 SPEC — world grid contract

#### Description

Document cell size, deterministic terrain function contract, digest shape (including reserved `visualRef`), overlay placement rules (authored biome wins in-footprint, decision 13), DM write + move APIs, hallucination-lock write-mediation rule (decision 10), on-demand expansion routing (decision 14), and single-cell agent grounding rules.

#### Acceptance criteria

- [ ] `src/shared/worldGrid/SPEC.md` (or agreed path) locks decisions above and open notes
- [ ] Shared types for cell coordinate, cell digest (incl. `visualRef`), move/write requests exported
- [ ] Explicit non-goals vs **m004**, vs region replacement, and vs any packed/chunked terrain storage

### 143.2 DB schema — sparse overlays + world seed (no terrain materialization)

#### Description

Migration + repositories for grid/world-seed metadata, sparse overlays (settlement, quest, faction stamp, dm notes), and entity cell positions, plus a pure/testable terrain function module. No terrain rows, no packed/chunked encoding, no million-row insert path — because nothing about terrain is ever inserted.

#### Acceptance criteria

- [ ] Campaign owns one world seed; cells addressable by `(x, y)` with no upper bound enforced by storage
- [ ] Terrain/biome/climate readable for arbitrary coordinates via the deterministic function, not a row lookup
- [ ] Terrain function is pure and deterministic — same seed + coords always yields the same result (tested)
- [ ] Sparse overlays and dm notes persist and join into the digest builder
- [ ] Tests cover overlay footprint boundaries and missing-overlay defaults

### 143.3 Overlay placement — campaign seed → footprints

#### Description

Post-campaign-generation pipeline: place region/faction/settlement footprints from campaign data (biased to match each region's already-authored biome/climate per decision 13), stamp quest zones, place NPC start cells. No terrain generation step.

#### Acceptance criteria

- [ ] Overlay placement invoked after campaign create persist (checklist noted)
- [ ] Seeded named regions/settlements occupy coherent multi-cell footprints
- [ ] Region footprint placement matches each region's authored biome/climate where the terrain function and the authored description would otherwise conflict
- [ ] NPC start cells set for generated NPCs
- [ ] Deterministic seed (campaign id / world seed) covered by tests

### 143.4 Entity positions + move APIs

#### Description

IPC/repo APIs to read/set character and NPC cell coordinates; move NPC to a cell (e.g. city meeting point); reject out-of-extent coordinates.

#### Acceptance criteria

- [ ] NPC move API updates position durably
- [ ] Character position API updates durably
- [ ] Invalid coordinates rejected without corrupt save
- [ ] Unit tests for move + bounds

### 143.5 DM permanent cell write

#### Description

API for DM/engine to upsert permanent cell context that appears in future digests. This is the only path by which narrative detail becomes permanent grid truth.

#### Acceptance criteria

- [ ] Write survives restart
- [ ] Digest includes dm notes / structured patches per SPEC
- [ ] No code path lets raw LLM narration output write digests directly — only this validated API can (tested)
- [ ] Tests for upsert + readback

### 143.6 Agent single-cell grounding

#### Description

Wire narration (and relevant NPC) context assembly to inject **only** the active character's current cell digest, read-only.

#### Acceptance criteria

- [ ] Context includes one cell digest, not neighborhood
- [ ] Token/budget discipline documented and tested (slim digest)
- [ ] Missing grid / pre-generation campaigns degrade safely (SPEC behavior)
- [ ] Context assembly path has no write access to grid data (read-only, tested)

### 143.7 Travel — multi-cell engine moves + on-demand expansion hook

#### Description

Engine path to move the player by N cells or to a destination cell in one call; sync `currentRegionId` when overlays demand it; keep time/day clamps compatible with **135**. When a move lands on a cell with no overlay coverage, route into the existing on-demand content-mint path (**134**/**141**) rather than a new expansion mechanism.

#### Acceptance criteria

- [ ] Multi-cell move updates position in one transaction
- [ ] Region id stays coherent with cell overlays
- [ ] Entering a cell with no overlay coverage triggers the existing on-demand content-mint path (134/141), tagging any newly minted content with a footprint
- [ ] Tests for single-step, multi-step, destination moves, and the no-coverage mint trigger

### 143.8 Verification — scale fixture + smoke notes

#### Description

Representative-scale fixture (large coordinate range, many overlays) plus runbook notes for create → grid setup → move → DM write → narration grounding. Full delivery gate.

#### Acceptance criteria

- [ ] Terrain-function determinism + read-path performance tests prove the approach at representative overlay counts (no chunk-boundary concept needed — there are no chunks)
- [ ] Smoke notes in `docs/runbooks/` (or ticket-linked)
- [ ] `npm test` / `lint` / `build` / `deadcode` / `act` green for the epic's code
