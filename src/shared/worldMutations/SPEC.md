# Hard world mutations — engine-owned place and person change

Causal consistency for place/person status: agents propose typed mutations; the engine validates FKs/clamps and persists structured region/NPC state. World facts narrate *why*; structured status wins for destroyed/altered/dead state. No semantic NLI contradiction judge — deterministic guards only.

Shared types: `src/shared/worldMutations/types.ts`. Persist: `src/agents/worldMutationNarration.ts` via `persistNarrationSideEffects`. Grounding digests: `digest.ts` + DM context assembly.

Builds on regions/`updateRegionStatus` (003), narration side effects (006), hub destroyed UI (038), routing starvation (040). Complements factions (125) — political memory ≠ place destruction.

<!-- EPIC-133 -->
**Shared time (133):** World mutations are world-scoped on the same campaign clock (`campaigns.in_game_date`). There are no per-PC parallel calendars; see `src/shared/sharedTime/SPEC.md`.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Typed mutation fields** on DM narration: `regionStatusUpdates`, `npcLifeUpdates`. Ops: region `destroy` / `damage` / `restore`; NPC `alive` (+ optional location). |
| 2 | **Engine authority.** Agents propose; repositories apply only valid mutations (campaign FK match). Invalid ids are ignored — never corrupt the save. |
| 3 | **Structured wins.** `regions.status` / `npcs.status` ground later turns; prose `worldFact` is complementary, not a substitute for status. |
| 4 | **Restore is explicit.** The only way to clear `destroyed` is `op: "restore"`. Damage never revives a destroyed place. |
| 5 | **Starvation.** Heuristic converse/act rows that skip `dmNarration` must defer when player input looks world-altering (burn/destroy/collapse/…). Routes that omit narration are explicitly non-mutating. |
| 6 | **Legacy saves.** Prose-only burns stay as facts; new burns also set structured status when proposed. |
| 7 | **Hub.** Destroyed/altered regions surface from structured `Region.status` (038). |
| 8 | **Token discipline (040).** Slim status digests — not full history dumps. |

## Region status shape (JSON on `regions.status`)

| Field | Notes |
|-------|-------|
| `destroyed` | boolean — full ruin / gone as a place |
| `damaged` | optional boolean — structural harm without full destroy |
| `cause` | optional short string (fire, siege, …) |

Default on create: `{ destroyed: false }`.

### Region mutation ops

| Op | Effect |
|----|--------|
| `destroy` | `{ destroyed: true, damaged: false, cause? }` |
| `damage` | If already destroyed: keep destroyed; refresh `cause` if provided. Else `{ destroyed: false, damaged: true, cause? }`. |
| `restore` | `{ destroyed: false, damaged: false }` (clears cause) |

Proposal shape: `{ regionId, op, cause? }`.

### Validation

- `regionId` must exist and belong to the narration campaign; else drop.
- Unknown `op` → drop.
- `cause` optional; when present, trim and clamp to `WORLD_MUTATION_CAUSE_MAX_CHARS`.

## NPC life updates

Proposal: `{ npcId, alive: boolean, location?: string, cause?: string }`.

- `npcId` must exist and belong to the campaign; else drop.
- Apply via `updateNpcStatus` (preserve unrelated status fields; set `alive`; optional `location`).
- Aligns with combat writers (`setNpcEncounterOutcome` / slain) — narration may also mark death/defeat outside combat.

PC death remains `storyDrivenDeath` → `markCharacterDead` (unchanged).

## Grounding priority

Context assembly includes:

1. Structured `regionStatus` (existing JSON line).
2. Slim **world-mutation digest** when the region is destroyed/damaged or present NPCs are dead — forbids treating a destroyed place as pristine without a restore proposal.
3. Present NPC list includes `alive` so the model sees dead/absent people.

Budget: digest ≤ `WORLD_MUTATION_DIGEST_MAX_CHARS`; ≤ `WORLD_MUTATION_DIGEST_MAX_NPC_LINES` dead-NPC lines.

## Illegal pristine assumptions (deterministic)

| Case | Behavior |
|------|----------|
| Proposal would clear `destroyed` without `op: "restore"` | Impossible via typed ops; malformed payloads dropped |
| `damage` on already-destroyed region | Kept destroyed; not treated as revive |
| Destroyed region in context | Digest instructs: do not describe as intact unless proposing `restore` |
| Semantic prose vs status | No NLI judge — structured status + digest only |

## Which routes may emit mutations

| Route / beat | May emit typed mutations? |
|--------------|---------------------------|
| `dmNarration` (via `persistNarrationSideEffects`) | **Yes** — sole write path |
| Heuristic `converse` (`npcResponse` only) | **No** — non-mutating; defer to LLM when world-alter verbs appear |
| Heuristic `act` (`playerActionExpression` only) | **No** — same starvation guard |
| Rest / travel / modifyItem / combat bypass | **No** narration persist |
| Ask-the-DM OOC | **No** (see OOC SPEC) |

World-alter verb signals (non-exhaustive, heuristic): burn, destroy, collapse, massacre, raze, demolish, sack, ruin, torch, level (the village), rebuild, restore (place).

## Optional worldFact

Narration may still set `worldFact` alongside mutations (why the place fell). Fact does not replace status.

## Out of scope (v1)

- Weather/season sim, tick-based disasters, map/pixel destruction
- Rewriting historical free-text facts into structured rows
- Full semantic contradiction LLM
