# Play-time world population — contract (epic **134**)

On-demand minting during play for NPCs (and optionally places) from typed DM proposals. Builds on flagged NPC identity bundle (**052**), faction mint (**125**), journal known-candidate rules (**121**), and bestiary foe spawn (**116** — enemies stay on that path).

Shared types and pure helpers live under `src/shared/playPopulation/`. Persistence runs from `persistNarrationSideEffects` via `src/agents/npcPlayMintNarration.ts`.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Typed proposals only.** DM emits `npcProposals` (and optionally `placeProposals` when implemented). Engine validates — no silent string-match auto-detect from prose. |
| 2 | **Idempotency.** Same `key` (campaign slug) or same case-insensitive `name` in the target region → skip mint, keep existing row. |
| 3 | **Per-turn clamp.** At most **2** valid `npcProposals` persist per narration side-effect pass; extras are dropped without error. |
| 4 | **FK-safe.** Unknown `regionId` / `factionId` / keys fall back or null — never throw on bad FK hints. |
| 5 | **Known-candidate set unchanged.** Minted NPCs appear in `presentNpcs` (region roster) but **not** in journal `personCandidates` until log-book link, dossier generation, or explicit meet rules (**121**). |
| 6 | **Identity bundle for speaking NPCs.** `canSpeak !== false` requires `name`, `role`, `disposition`, `raceKey`, `genderKey`, `classKey`, and valid `alignment`. |
| 7 | **Place mint deferred (v1).** Light region/sub-location mint is out of scope for this epic — see follow-up **142**. `placeProposals` are ignored until then. |

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

## Idempotency

1. Resolve target region (proposal `regionId` / `regionKey`, else turn `regionId`).
2. If an NPC in that region already has the same case-insensitive `name` → no-op.
3. Else if `key` is set and any NPC in the campaign has `slugify(name) === slugify(key)` → no-op.
4. Else `createNpc` with identity bundle fields and optional faction membership.

Note: without a persisted `play_mint_key` column (v1), key idempotency matches slugified **names** — choose keys aligned with the NPC display name (e.g. `barkeep-tom` for "Tom") or rely on name+region dedupe.

## Clamp

`MAX_NPC_PROPOSALS_PER_TURN = 2`. Applied after validation; order preserved.

## Place mint (deferred)

Follow-up epic **142** (`board/backlog/142-play-place-mint-light-regions.md`). Until then:

- Do not parse or persist `placeProposals`.
- Document only — no silent README promise of place mint in v1.

## Integration

| Surface | Behavior |
|---------|----------|
| `NarrationResult.npcProposals` | DM schema + guidance in `src/agents/dm.ts` |
| `persistNarrationSideEffects` | Calls `persistNpcPlayMintSideEffects` after faction effects |
| `presentNpcs` | Minted NPC in region appears on next context assembly |
| `journal:listPersonMatchCandidates` | Minted NPC excluded until log-book / dossier rules |

## Out of scope (v1)

- Full open-world off-screen population
- Player debug spawn UI
- Replacing Review bulk mint
- `placeProposals` persistence (see **142**)
- `bestiaryEncounterSpawn.ts` foe path (**116**)
