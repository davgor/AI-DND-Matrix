# Follow-up: Light play-time place mint (134.4 deferral)

Epic **134** shipped NPC play mint only. Place/region mint from `placeProposals` was deferred to keep scope bounded — region create exists but wiring sub-locations, parent-region FK resolution, and DM prompt budget needs a dedicated pass.

## Scope (when picked up)

- Typed `placeProposals` in narration schema (key, name, description, optional parent region)
- Idempotent `createRegion` (or sub-location row if schema supports it) during `persistNarrationSideEffects`
- Per-turn clamp aligned with NPC mint
- Tests + smoke notes

## Rationale for deferral

- NPC mint unblocks the primary “empty world” pain (bartender, guard, merchant).
- Place mint touches region graph, travel routing, and hub map semantics — higher coupling than `createNpc`.
- No schema migration required for NPC path; place mint may need region metadata or parent links.

## Acceptance criteria

- [x] SPEC section in `src/shared/playPopulation/SPEC.md` updated from deferral to live contract
- [x] `placeProposals` persist idempotently
- [x] Smoke: unnamed hamlet minted in play survives reopen
