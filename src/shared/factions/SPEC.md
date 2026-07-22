# Campaign factions — intrigue, faiths, reputation, gods-as-NPCs

First-class power blocs (mortal + religious) with per-PC reputation, durable inter-faction relations, NPC membership, and idempotent deity → NPC manifestation. Agents propose fiction and updates; the engine owns keys, FKs, scores, clamps, uniqueness, and manifestation idempotency.

Shared types live in `src/shared/factions/types.ts`. Schema + repositories land in **125.2**; create stage in **125.3**; NPC binding in **125.4**; review/hub in **125.5**; play proposals in **125.6**; digests in **125.7**; manifestation in **125.8**.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Narrative-first divinity.** No divine spell-economy / boon feat tree in v1. Gods matter through religious faction reputation, clergy NPCs, world facts / omens, and NPC-ified deities when they appear. |
| 2 | **One faction system.** Courts, guilds, and cults share faction + reputation + relation machinery. Faiths use `kind = religious` + optional `deityId`. |
| 3 | **Setting-weighted pressure.** Create emits `factionPressure`: `light` \| `medium` \| `heavy`. |
| 4 | **Reputation is always per player character × faction** — never campaign-shared. Updates apply only to the acting PC’s row. |
| 5 | **Intrigue is a valid playpath.** Durable relation edges + reputation + membership support courts/coups/double-crosses without a war-clock sim. |
| 6 | **`world_facts.faction_tag` coexistence.** Loose string tags remain for retrieval. Special tag `quest_hook` is unchanged. Prefer aligning new fact tags to faction `key` when known; do not rewrite historical free-text tags into FKs. |
| 7 | **Legacy campaigns.** No mandatory backfill; empty roster hides UI; on-demand mint + NPC-ify still work. |

## Faction kinds

`FactionKind`:

| Kind | Typical fiction |
|------|-----------------|
| `civic` | City watch, civic guilds, harbor authorities |
| `military` | Legions, militias, knightly orders |
| `mercantile` | Trade houses, caravan leagues |
| `criminal` | Thieves’ guilds, smuggling rings |
| `clandestine` | Spy cabals, secret societies (not necessarily criminal) |
| `political` | Courts, noble houses, councils |
| `religious` | Temples, churches, cults, inquisitions |

Religious factions **should** set `deityId` when tied to a known deity. Heresies / syncretic cults may omit `deityId` or point at a forgotten god.

## Faction pressure bands (create normalize)

| Pressure | Roster count (inclusive) | Relation edges (inclusive) | Soft expectations |
|----------|--------------------------|----------------------------|-------------------|
| `light` | 2–4 | 0–2 | Religious faction optional even if deities exist |
| `medium` | 3–7 | 2–5 | When ≥1 deity exists → ≥1 `religious` faction after normalize |
| `heavy` | 6–10 | 4–10 | Same religious minimum; prefer mixed kinds; story may hook intrigue/faith conflict |

Normalize clamps oversized/undersized rosters into the band (drop extras by `sortOrder` / pad is not invented by the engine — under-delivery fails validation for create contract fixtures). Kind mix: reject all-same-kind rosters of size ≥3.

## Faction record

| Field | Notes |
|-------|-------|
| `id` | TEXT PK |
| `campaignId` | FK → campaigns |
| `key` | Stable slug, unique per campaign |
| `name` | Display name |
| `kind` | `FactionKind` |
| `summary` | Short blurb (required) |
| `motivation` / `publicFace` / `methods` | Optional short strings |
| `deityId` | Nullable FK → deities |
| `homeRegionId` | Nullable FK → regions |
| `sortOrder` | Display order |
| `createdAt` | ISO |
| `source` | `campaign_create` \| `dm_play` |

Campaign columns: `factionsSummary` (TEXT), `factionPressure` (`FactionPressure`).

## Inter-faction relations

`FactionRelationStance`: `ally` \| `rival` \| `tense` \| `secret` \| `war`.

Edges are **undirected for uniqueness**: store with canonical ordering `factionAId < factionBId` (lexicographic id compare). Self-edges forbidden. At most one row per unordered pair per campaign.

| Field | Notes |
|-------|-------|
| `id` | TEXT PK |
| `campaignId` | FK |
| `factionAId` / `factionBId` | FKs, canonical order |
| `stance` | `FactionRelationStance` |
| `summary` | Optional one-line intrigue hook |
| `updatedAt` | ISO |

Not a diplomacy sim or tick-based war clock.

## Reputation (per PC × faction)

| Field | Notes |
|-------|-------|
| `characterId` | Player character only (v1) |
| `factionId` | FK → factions |
| `score` | Integer, clamped to `REPUTATION_SCORE_MIN`…`REPUTATION_SCORE_MAX` |
| `band` | Derived by engine from score (`ReputationBand`) |
| `updatedAt` | ISO |
| `lastReason` | Optional short reason from last applied update |

**Defaults:** no row ⇒ treat as `neutral` / score `0` for digests and NPC tone.

### Score & bands

| Constant | Value |
|----------|-------|
| `REPUTATION_SCORE_MIN` | −100 |
| `REPUTATION_SCORE_MAX` | 100 |
| `REPUTATION_DELTA_MAX_ABS` | 25 (per single update) |

| Band | Score range (inclusive) |
|------|-------------------------|
| `hostile` | −100 … −51 |
| `unfriendly` | −50 … −21 |
| `neutral` | −20 … 20 |
| `friendly` | 21 … 50 |
| `allied` | 51 … 100 |

Updates prefer **deltas**. Absolute score proposals are rejected or converted only if SPEC’d later — v1 play path uses deltas. Engine: clamp delta magnitude, apply, clamp score, recompute band. Character A’s update never mutates Character B’s row for the same faction.

## NPC membership

On `npcs`:

| Field | Notes |
|-------|-------|
| `factionId` | Nullable FK |
| `factionMembershipRole` | Optional short role string (e.g. `acolyte`, `captain`, `informant`) |
| `deityId` | Nullable FK — used for divine manifestations; mortal clergy may also reference a deity |
| `isDivineManifestation` | Integer 0/1 — **true only** for NPC-ified deities (not mortal priests) |

**Clergy bias (create + flagged NPC):** when `factionPressure` is `medium` or `heavy`, or the premise/world is faith-forward, prefer assigning clergy / acolyte / inquisitor / cultist roles to `religious` factions. Unknown faction keys are dropped (no orphan FKs).

## Deity manifestation (NPC-ify)

| Rule | Detail |
|------|--------|
| Trigger | DM `deityManifestation` proposal, or `npcProposals` carrying `deityId` when a god personally interacts |
| Idempotency | **At most one living manifestation NPC per deity** (`isDivineManifestation = 1` + matching `deityId`). Second request returns the existing NPC id |
| Create | Name/epithet from deity; `canSpeak = true`; disposition/temperament from domains/tenets; prefer primary religious faction for that deity when one exists |
| Missing deity | Reject |
| Forgotten gods | Allowed — still a normal NPC row |
| Play path | Normal NPC agent (memories, Social, dossier **105**) — no separate god-chat system |
| Avatars | Not in v1 — one manifestation row only |

## Play proposals (DM narration side effects)

| Proposal | Purpose |
|----------|---------|
| `factionProposals` | Mint faction (+ optional initial relations) |
| `reputationUpdates` | `{ characterId, factionId \| factionKey, delta, reason? }` — characterId must be active PC |
| `relationUpdates` | Upsert stance/summary for a faction pair |
| `npcFactionUpdates` | Set/clear NPC membership role |
| `deityManifestation` | Ensure manifestation NPC for `deityId` |

Engine validates uniqueness + FKs; clamps reputation; rejects unknown keys.

## Digest budgets (040)

| Digest | Default (slim) | Enriched |
|--------|----------------|----------|
| When | Always when factions exist | `factionPressure === 'heavy'` **or** turn route/intent is intrigue- or faith-tagged |
| Faction lines | Up to `FACTION_DIGEST_SLIM_MAX_LINES` (6); `key`, `name`, `kind`, optional deity name | Up to `FACTION_DIGEST_ENRICHED_MAX_LINES` (10); may include one-line `summary` |
| Relations | Up to `FACTION_RELATION_DIGEST_SLIM_MAX` (4) edges | Up to `FACTION_RELATION_DIGEST_ENRICHED_MAX` (8) |
| Reputation | Acting PC only; up to `FACTION_REPUTATION_DIGEST_MAX` (6) non-neutral rows (or all if fewer) | Same cap |
| Pantheon | **Omitted** by default | Include compact pantheon digest (name, epithet, domains, forgotten) when enriched **and** faith/divine-relevant, or when pressure is heavy — closes **059** play-grounding deferral without full tenets every turn |
| Char caps | `FACTION_DIGEST_LINE_MAX_CHARS` (120) per faction line | Same |

Never dump full motivation/methods/blurbs every turn.

## Authority boundary

Agents propose fiction + updates. Engine owns: slug keys, FK integrity, reputation scores/bands/clamps, relation canonicalization, uniqueness, and manifestation idempotency.

## Intrigue playpath expectations

Heavy-pressure creates should leave enough structure (relations + mixed kinds + optional faith conflict) for the DM to run court/temple intrigue without inventing the graph mid-play. Soft prompt/fixture expectation — not a hard fail if a single model pass under-delivers once; contract fixtures encode the happy path.
