# Play-time world population — contract (epic **134** + ticket **141**)

On-demand minting during play for NPCs and light places/regions from typed DM proposals. Builds on flagged NPC identity bundle (**052**), faction mint (**125**), journal known-candidate rules (**121**), and bestiary foe spawn (**116** — enemies stay on that path).

Shared types and pure helpers live under `src/shared/playPopulation/`. Persistence runs from `persistNarrationSideEffects` via `src/agents/npcPlayMintNarration.ts` and `src/agents/placePlayMintNarration.ts`.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Typed proposals only.** DM emits `npcProposals` and `placeProposals`. Engine validates — no silent string-match auto-detect from prose. |
| 2 | **Idempotency.** Same `key` (campaign slug) or same case-insensitive `name` in the target scope → skip mint, keep existing row. |
| 3 | **Per-turn clamp.** At most **2** valid `npcProposals` and **2** valid `placeProposals` persist per narration side-effect pass; extras are dropped without error. |
| 4 | **FK-safe.** Unknown `regionId` / `factionId` / `parentRegionId` / keys fall back or null — never throw on bad FK hints. |
| 5 | **Known-candidate set unchanged.** Minted NPCs appear in `presentNpcs` (region roster) but **not** in journal `personCandidates` until log-book link, dossier generation, or explicit meet rules (**121**). |
| 6 | **Identity bundle for speaking NPCs.** `canSpeak !== false` requires `name`, `role`, `disposition`, `raceKey`, `genderKey`, `classKey`, and valid `alignment`. |
| 7 | **Place mint live (ticket 141).** Light region mint via `placeProposals` → idempotent `createRegion`. Parent hints resolve FK-safely; unknown → turn region. No `parent_region` column yet — spatial nesting is **142** (world-grid). |

## `npcProposals` shape

```typescript
{
  key?: string           // campaign-unique slug; idempotent re-proposal
  name: string
  role: string
  disposition: string
  backstory?: string
  regionId?: string      // defaults to turn region
  regionKey?: string     // slugified region name fallback
  canSpeak?: boolean     // default true
  temperament?: Temperament
  alignment?: Alignment | null
  raceKey?: string | null
  backgroundKey?: string | null
  genderKey?: string | null
  classKey?: string | null
  factionId?: string
  factionKey?: string
  factionMembershipRole?: string | null
  purpose?: 'introduced_in_scene' | 'background_presence'  // metering tag; clamp is authoritative
}
```

Invalid proposals are skipped silently (same pattern as faction side effects).

## Idempotency (NPCs)

1. Resolve target region (proposal `regionId` / `regionKey`, else turn `regionId`).
2. If an NPC in that region already has the same case-insensitive `name` → no-op.
3. Else if `key` is set and any NPC in the campaign has `slugify(name) === slugify(key)` → no-op.
4. Else `createNpc` with identity bundle fields and optional faction membership.

Note: without a persisted `play_mint_key` column (v1), key idempotency matches slugified **names** — choose keys aligned with the NPC display name (e.g. `barkeep-tom` for "Tom") or rely on name+region dedupe.

## Clamp (NPCs)

`MAX_NPC_PROPOSALS_PER_TURN = 2`. Applied after validation; order preserved.

## `placeProposals` shape (ticket **141**)

```typescript
{
  key: string                 // campaign-unique slug; idempotent re-proposal
  name: string
  description: string
  parentRegionId?: string     // optional parent hint; FK-safe
  parentRegionKey?: string    // slugified parent region name fallback
}
```

Invalid proposals are skipped silently.

## Idempotency (places)

1. Resolve optional parent (`parentRegionId` / `parentRegionKey`); unknown → turn `regionId` (never throw). Parent is **not** written to a FK column in light mint.
2. If any region in the campaign already has the same case-insensitive `name` → no-op.
3. Else if `slugify(region.name) === slugify(key)` for any campaign region → no-op.
4. Else `createRegion` (peer campaign region).

## Clamp (places)

`MAX_PLACE_PROPOSALS_PER_TURN = 2`. Applied after validation; order preserved.

## Integration

| Surface | Behavior |
|---------|----------|
| `NarrationResult.npcProposals` | DM schema + guidance in `src/agents/dm.ts` |
| `NarrationResult.placeProposals` | DM schema + guidance in `src/agents/dm.ts` |
| `persistNarrationSideEffects` | Calls `persistNpcPlayMintSideEffects` then `persistPlacePlayMintSideEffects` after faction effects |
| `presentNpcs` | Minted NPC in region appears on next context assembly |
| `listRegionsByCampaign` | Minted place appears as a campaign region |
| `journal:listPersonMatchCandidates` | Minted NPC excluded until log-book / dossier rules |

## Out of scope

- Full open-world off-screen population
- Player debug spawn UI
- Replacing Review bulk mint
- Spatial nesting / `parent_region` column / world-grid (**142**)
- `bestiaryEncounterSpawn.ts` foe path (**116**)
