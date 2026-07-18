# EPIC: Moonshot m004 - pixel/sprite grid campaign type (FF + Pokemon-style)

Add a hard-forked **sprite** campaign world type alongside the existing **narrative** (text-adventure) type. Sprite campaigns keep the standard campaign generation flow (world → regions → NPCs → story), then generate a multi-map traversable world and play it as old-school Final Fantasy–style grid / turn-based gameplay.

## Core concept

- At campaign create, a toggle chooses `worldType: narrative | sprite` before Generate.
- Hitting Generate hard-forks the pipeline and play shell; narrative campaigns stay unchanged.
- Sprite campaigns still run the standard generation stages first, then generate maps and a multi-map world graph from that content.
- Maps are **LLM-planned, asset-composed**: the model proposes layout/intent; a deterministic composer places pregenerated tiles, buildings, and furniture so walls and walkability stay engine-valid.
- Characters use a **sprite component book** (body, hair, outfit pieces, etc.). Assemblies persist as ordered component ids on the NPC/entity.
- Known campaign NPCs are placed onto maps; maps may also include **unassigned sprite entities**. On first player interaction, the game generates/assigns identity (and/or completes component binding) from sprite appearance + location context, then persists it.
- Exploration is **grid-based** multi-map travel (Pokemon-like overworld / interiors / transitions).
- Combat is **turn-based** in an FF-inspired loop, mechanics informed by the existing rules engine (abilities, checks, HP/AC, initiative, conditions) — not free-text encounter narration as the primary UI.

Broken down into sub-tickets m004.1–m004.12. This moonshot is considered vetted when all required criteria below are met.

## Moonshot vetting criteria

- Create toggle clearly selects narrative vs sprite; Generate forks pipelines with no cross-contamination of play shells
- After standard world/region/NPC/story generation, sprite campaigns produce a multi-map graph that reloads after restart
- Maps are solvable and collision-correct (walls block; transitions work); LLM never becomes source of truth for walkability
- Sprite NPCs persist component-id outfits; lazy identity assignment on first interact is stable across save/reload
- Player can traverse multiple maps, interact with entities, and enter FF-style turn-based combat using existing engine rules
- Narrative campaigns remain regression-free (create + play unchanged)

## Out of scope (for this moonshot)

- Real-time action combat or Zelda-like free movement
- Image-to-tilemap vision pipelines
- Online multiplayer on sprite maps (see m002)
- Fully AI-painted tilesets (assets are pregenerated component libraries)
- Replacing narrative mode; this is an alternate world type, not a rewrite of text play

## Relationship to other moonshots

- **m001** (image gen): complementary later for portraits/backgrounds; m004 v1 uses pregenerated pixel component packs, not cloud image gen
- **m003** (mods): future path to ship additional tilesets/component packs as mod content

m004.1 architecture and worldType contract · m004.2 create UX toggle and generate hard-fork · m004.3 pregenerated asset catalogs (tiles, props, sprite components) · m004.4 multi-map world schema, transitions, and persistence · m004.5 post-campaign map generation (LLM plan → asset compose) · m004.6 NPC and ambient entity placement · m004.7 lazy identity and sprite binding on interact · m004.8 grid exploration engine (move, collide, travel maps) · m004.9 sprite play renderer and shell · m004.10 FF-style turn-based combat informed by existing rules · m004.11 agent grounding for sprite campaigns · m004.12 moonshot validation runbook and go/no-go metrics
