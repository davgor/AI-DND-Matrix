# EPIC: World grid — spatial data model for persistent world locations

Build a **campaign-scoped square world grid**: a durable spatial index that maps locations to datapoints (terrain, biome, climate, factions, quests, settlements, NPC positions) so the DM and other agents can be grounded from **where the party is**, not only from free-text regions.

This is a **data model first**. No player-facing map UI and no pixel-sprite traversable world (**m004**) in this epic. The grid is an experiment that can later feed more game-like movement, combat staging, and (optionally) sprite maps — but v1 only needs persistable cells, seed/generation, agent read of **one cell**, and DM write/move APIs.

Builds on **054** / **057** (world + regions), **038** (travel / `currentRegionId`), existing NPC + region repos. Complements **125** (factions), **130** (hard world mutations), **134** (live population), **135** (travel intents). Distinct from **m004** (sprite multi-map play shell).

## Product stance (locked from design Q&A)

| Question | Locked stance |
|----------|---------------|
| Data vs UI? | **Data model + locate APIs.** Optional schematic debug UI later; not required for epic done. |
| Regions vs cells? | **Regions span thousands of cells.** Cell ≈ house footprint; region ≈ country. Regions remain first-class campaign entities; the grid is the spatial substrate under them. |
| Topology? | **Square grid.** |
| Scale? | **Millions of cells** for a campaign world. Procedural layers in Perlin-/noise-like order: oceans/continents → rivers → biomes/climate → region overlays → factions → villages/settlements → NPCs. |
| When generated? | **After campaign generation** so world/region/NPC/faction outputs **seed** placement. The **full spatial extent** exists up front (coordinates are valid everywhere); detail is **hybrid** (see decision 10). |
| Agent context? | Agents pull **one cell** only. Multi-cell phenomena (biome bands, faction territory, quest zones) are **duplicated or projected into each covered cell** so a single-cell read is self-sufficient. |
| Authority? | **Grid feeds the LLM.** Narration is grounded from cell data; DM/engine APIs write permanent cell context and move entities. LLM does not invent the terrain layer. |
| Travel? | **Cell-to-cell.** Canonical cell size **60 ft × 60 ft**. DM/engine may advance the player **multiple cells in one action** (day’s travel, teleport, escort). |
| NPC location? | NPCs have a **grid cell coordinate** (and can move). Example: “I’ll meet you in X city” → DM/engine API relocates the NPC to a cell inside that settlement. |
| vs m004? | **Not** the sprite traversable world. May seed m004 later; this epic is narrative-campaign persistent spatial data only. |

## Target flow

```
Campaign create (existing)
  premise → world → regions → factions → NPCs → story → persist

World-grid generation (NEW; post-create)
  seed from campaign world/regions/factions/settlements/NPCs
    → allocate grid extent (width × height in cells)
    → procedural layers (noise): land/ocean, elevation, rivers, biome, climate
    → stamp region overlays across thousands of cells (duplicated digests)
    → stamp faction territories, quest zones, village footprints
    → place NPCs on cells (settlement-biased)
    → persist packed terrain + sparse overlays + entity positions

Play
  character.currentCell (x, y)  [and keep region id in sync when cell∈region]
    → assembleDmContext reads THAT cell only (self-contained digest)
    → travel intent → engine moves N cells (60 ft each) + optional region update
    → DM APIs: writeCellContext / moveNpcToCell / moveCharacterCells
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **First-class world grid** per campaign: extent, origin, cell size constant (`CELL_SIZE_FT = 60`). |
| 2 | **Storage must support millions of cells** without naïvely inserting millions of fat JSON rows. SPEC must choose a packed/chunked terrain representation plus **sparse overlays** for settlements, quests, DM annotations, and entity positions. “Duplicated into cells” may be **materialized at read time** from overlay + region stamps when that is cheaper than storing full copies everywhere — but the **read API still returns one self-contained cell digest**. |
| 3 | **Generation runs after campaign persist** (async or staged job is fine). Campaign entities seed named places and NPC starts; noise fills the rest of the extent. |
| 4 | **Hybrid detail:** full coordinate space + terrain/biome/climate layers exist for the whole map at generation; settlement/quest/NPC density is seeded from campaign + procedural fill; **DM write path** permanently enriches cells thereafter. |
| 5 | **Cell digest (v1 fields)** at least: `terrain`, `biome`, `climate`, `factionIds` / faction digest, `questInfo` (hooks/ids), region membership/digest, settlement label if any, plus `dmNotes` (permanent DM-written context). SPEC finalizes schema. |
| 6 | **Multi-cell features** (rivers, biomes, faction borders, quest areas) cover ranges; each cell in range exposes the feature in its digest. |
| 7 | **Entity positions:** player character(s) and NPCs store `(cellX, cellY)` (and optionally sub-cell later — out of scope). Moving an NPC is an engine API, not chat-memory. |
| 8 | **Travel:** engine-owned position updates by cell delta or destination cell; multi-cell moves allowed in one call; day/time clamps remain engine-owned (**135** sibling). When a move crosses region overlays, update `currentRegionId` consistently. |
| 9 | **Agent grounding:** narration/NPC context assembly injects **only the active cell digest** (budgeted). No neighborhood dump in v1. |
| 10 | **DM write API:** append/upsert permanent cell context (`dmNotes` / structured patches) that survives restart and is preferred in digests. |
| 11 | **No player map UI required** for epic completion; repo/IPC/tests are enough. Dev-only inspection helpers optional. |
| 12 | **Campaign create checklist** applies to any create-pipeline hook that kicks off grid generation. |

## Definition of done

- Post-create generation produces a campaign grid with millions-of-cells **extent** and queryable cell digests
- Campaign-seeded regions/settlements/NPCs appear at coherent coordinates
- Character + NPC positions are cell-based; move APIs work and persist
- DM can write permanent cell context; agents see it on next turn from the single-cell read
- Travel can move multiple 60 ft cells in one engine call and keep region membership coherent
- Storage strategy documented and tested at representative scale (not full million-row insert in unit tests — use chunk/extent tests + capped integration fixture)
- Delivery gate: tests, lint, build, deadcode, `act`

141.1 SPEC + types · 141.2 Storage/schema (packed + sparse) · 141.3 Procedural generation + campaign seed · 141.4 Entity positions + move APIs · 141.5 DM cell write API · 141.6 Agent single-cell grounding · 141.7 Travel multi-cell engine path · 141.8 Tests + scale fixture + smoke notes

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **054** / **057** | World + regions seed grid overlays |
| **125** | Faction territories stamp cells; reputation stays on **125** tables |
| **130** | Place destruction may later patch cell/region overlays; not required in 141 v1 beyond leaving extension points in SPEC |
| **134** | On-demand NPCs should receive a cell when minted (follow-up hook) |
| **135** | Travel intents should eventually resolve to cell moves; 141 supplies the position model |
| **038** | Hub region display remains; grid is under the hood |
| **m004** | Future consumer of coordinates/placements; **out of scope** here |

## Out of scope (v1)

- Player-visible world map / fog of war UI
- Pixel-sprite maps, walkability, collision (**m004**)
- Hex grids or continuous coordinates
- Agent neighborhood / multi-cell context windows
- Real-time weather simulation ticks
- Sub-cell (ft-within-cell) positioning
- Multiplayer shared grid sync (**m002** / **m005**)
- Replacing the existing region list UX

## Open implementation notes (SPEC must resolve)

- Exact extent heuristic (e.g. derived from region count × country-scale cell budget) and max caps for device safety
- Chunk size / packed encoding for terrain layers
- Whether region history text is inlined into every cell digest or referenced by `regionId` with a short stamp (read API still returns one payload)
- Job UX: blocking create vs background “world grid generating…” on hub
- Coordinate system: origin, axial direction, serialization

## Sub-tickets

### 141.1 SPEC — world grid contract

#### Description

Document cell size, extent rules, digest shape, packed vs sparse storage contract, generation stage order, DM write + move APIs, and single-cell agent grounding rules.

#### Acceptance criteria

- [ ] `src/shared/worldGrid/SPEC.md` (or agreed path) locks decisions above and open notes
- [ ] Shared types for cell coordinate, cell digest, move/write requests exported
- [ ] Explicit non-goals vs **m004** and vs region replacement

### 141.2 DB schema — packed terrain + sparse overlays

#### Description

Migration + repositories for grid metadata, chunked/packed terrain (or equivalent), sparse overlays (settlement, quest, faction stamp, dm notes), and entity cell positions. No million-row naïve insert path.

#### Acceptance criteria

- [ ] Campaign can own one grid extent; cells addressable by `(x, y)`
- [ ] Terrain/biome/climate readable for arbitrary in-extent coordinates
- [ ] Sparse overlays and dm notes persist and join into digest builder
- [ ] Tests cover chunk boundaries and missing-overlay defaults

### 141.3 Generation — noise layers + campaign seed

#### Description

Post-campaign-generation pipeline: allocate extent, run procedural layers, stamp regions/factions/settlements from campaign data, place NPCs.

#### Acceptance criteria

- [ ] Generation invoked after campaign create persist (checklist noted)
- [ ] Seeded named regions/settlements occupy coherent multi-cell footprints
- [ ] NPC start cells set for generated NPCs
- [ ] Deterministic seed (campaign id / world seed) covered by tests

### 141.4 Entity positions + move APIs

#### Description

IPC/repo APIs to read/set character and NPC cell coordinates; move NPC to a cell (e.g. city meeting point); reject out-of-extent coordinates.

#### Acceptance criteria

- [ ] NPC move API updates position durably
- [ ] Character position API updates durably
- [ ] Invalid coordinates rejected without corrupt save
- [ ] Unit tests for move + bounds

### 141.5 DM permanent cell write

#### Description

API for DM/engine to upsert permanent cell context that appears in future digests.

#### Acceptance criteria

- [ ] Write survives restart
- [ ] Digest includes dm notes / structured patches per SPEC
- [ ] Tests for upsert + readback

### 141.6 Agent single-cell grounding

#### Description

Wire narration (and relevant NPC) context assembly to inject **only** the active character’s current cell digest.

#### Acceptance criteria

- [ ] Context includes one cell digest, not neighborhood
- [ ] Token/budget discipline documented and tested (slim digest)
- [ ] Missing grid / pre-generation campaigns degrade safely (SPEC behavior)

### 141.7 Travel — multi-cell engine moves

#### Description

Engine path to move the player by N cells or to a destination cell in one call; sync `currentRegionId` when overlays demand it; keep time/day clamps compatible with **135**.

#### Acceptance criteria

- [ ] Multi-cell move updates position in one transaction
- [ ] Region id stays coherent with cell overlays
- [ ] Tests for single-step, multi-step, and destination moves

### 141.8 Verification — scale fixture + smoke notes

#### Description

Representative-scale fixture (large extent, chunked reads) plus runbook notes for create → grid gen → move → DM write → narration grounding. Full delivery gate.

#### Acceptance criteria

- [ ] Scale/chunk tests prove read path without full million-row materialization in CI
- [ ] Smoke notes in `docs/runbooks/` (or ticket-linked)
- [ ] `npm test` / `lint` / `build` / `deadcode` / `act` green for the epic’s code
