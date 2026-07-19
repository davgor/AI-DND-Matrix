# 090 — Selective NPC responses from scene context

When the DM resolves a player turn, not every present NPC should reply. The routing step should choose respondents from who is addressed and who is involved in the scene. The 084/088 “all present NPCs” fallback remains only for clear group address (or a single present NPC), so Social never goes silent — without a chorus of background characters.

## Acceptance criteria

- [x] Routing system guidance tells the model to pick targeted respondents (usually the addressee), not the full regional roster by default
- [x] Fallback plan selects named/mentioned NPCs when present; uses all present only for clear group address or a single NPC
- [x] Unclear multi-NPC fallback with no names/group cue uses `dmNarration` (never silent, no full-roster chorus)
- [x] Unit tests cover name match, group address, single NPC, and unclear multi-NPC fallback
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
