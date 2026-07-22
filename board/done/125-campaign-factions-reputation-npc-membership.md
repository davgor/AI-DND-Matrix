# EPIC: Campaign factions — intrigue, faiths, reputation, and gods-as-NPCs

Campaigns already invent guilds, cults, militias, and courts in free prose, and `world_facts.faction_tag` is a loose string used for retrieval (plus the special `quest_hook` tag). Pantheon generation (**059**) ships gods at create, but **play-time pantheon grounding was deferred**, and there is still **no first-class faction entity** — so political intrigue and temple politics cannot stick the way a burned village does.

This epic makes **mortal and religious power blocs** a real play layer:

1. **Generated at campaign create** (after world + pantheon, before NPCs) with **setting-weighted heaviness** — intrigue-heavy premises get denser, more entangled rosters; quiet pastoral premises stay light.
2. **Religious factions are first-class** — temples, churches, cults, inquisitions linked to pantheon deities (including forgotten-god cults).
3. **Minted on demand during play** when the DM proposes a new faction.
4. **Reputation managed by the DM** — always **per player character × faction** (never a single campaign-wide standing); engine clamps + persists.
5. **NPCs associate** with factions (membership role); clergy and agents populate faiths and courts.
6. **When gods start interacting, they are NPC-ified** — a durable NPC row bound to a deity, playable through the normal NPC agent path (memory isolation, Social, dossier), not a separate “god chat” system.
7. **Political intrigue is a valid playpath** — durable inter-faction relations (ally / rival / tense / secret) plus reputation and membership give the DM enough structure to run courts, coups, and double-crosses without a full war-clock sim.

Builds on **054** / **059** (world + pantheon), **052** (NPC identity), **006** / **083** (world-fact / RAG grounding), **045** (DM proposal side effects), **038** (hub), **011** (NPC promotion patterns), **105** (dossier). **Changes the campaign create pipeline** — `docs/runbooks/campaign-create-change-checklist.md` applies to create-touching sub-tickets.

## Product stance (answers the design questions)

| Question | Locked stance for this epic |
|----------|------------------------------|
| Gods: mechanical boons vs narrative-only? | **Narrative-first, system-backed.** No separate divine spell-economy in v1. Gods matter through **religious faction reputation**, **clergy NPCs**, **world facts / omens**, and — when they appear — **NPC-ified deities** who speak and act under engine rules like any powerful NPC. Optional later: mechanical boons as engine-clamped grants. |
| Divine politics vs mortal factions? | **Both, one faction system.** Courts, guilds, and cults share the same faction + reputation + relation machinery. Faiths are factions with `kind = religious` + `deity_id`; they compete with mortal blocs in the same intrigue graph. |
| How heavy should factions feel? | **Setting-weighted.** Create stage emits a `factionPressure` (`light` \| `medium` \| `heavy`) from premise + world. Heavy → larger roster, more relations, denser play grounding when intrigue is on-screen. Light → few factions, thin digest, no forced court plot. |

## Target flow

```
Campaign create
  premise → canon → pantheon → world
    → factions[] (NEW; grounded in world + pantheon)
         ├── kind mix includes religious when deities exist
         ├── religious rows link deity_id
         ├── factionPressure light|medium|heavy
         └── inter-faction relations (ally/rival/tense/secret)
    → regions → NPCs (faction membership; clergy ↔ religious factions)
    → … → story (may hook intrigue / faith conflicts) → persist

Play
  ├── Slim faction + relation + PC reputation digest in DM/NPC context (budgeted)
  ├── Pantheon slim digest when faiths / divine beats are relevant (closes 059 deferral surgically)
  ├── reputationUpdates / factionProposals / relationUpdates / npcFactionUpdates
  └── deityManifestation → ensure deity-bound NPC → Social / scene like any NPC

On-demand
  New guild, heresy, or court cabal → DM proposes faction (+ optional relations)
  God answers a prayer / walks the city → NPC-ify deity (once), then roleplay
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **First-class `factions` table** (campaign-scoped). Keep `world_facts.faction_tag` + `quest_hook`; prefer aligning tags to faction `key` when known. |
| 2 | **Create-time stage after world (pantheon already available).** Starter roster size and entanglement scale with **`factionPressure`**: light ~2–4, medium ~3–7, heavy ~6–10 (SPEC locks exact bands). Mix kinds — not five thieves’ guilds. |
| 3 | **Faction kinds** include at least: `civic`, `military`, `mercantile`, `criminal`, `clandestine`, `political`, **`religious`**. Religious factions **should** set `deity_id` when tied to a known deity; heresies / syncretic cults may omit or point at forgotten gods. |
| 4 | **Religious folks are faction play.** Create + flagged NPC generation prefers assigning clergy, acolytes, inquisitors, and cultists to religious factions when pressure ≥ medium or the premise is faith-forward. |
| 5 | **Inter-faction relations** are durable edges (`ally` \| `rival` \| `tense` \| `secret` \| `war` — SPEC finalizes enum). Required for intrigue playpath; not a full diplomacy sim or tick-based war clock in v1. |
| 6 | **On-demand DM minting** of factions (+ optional relations) via narration schema; engine validates uniqueness and FKs. |
| 7 | **Reputation is always per player character × faction — never campaign-shared.** Each PC has their own standing with each faction (hub multi-PC: A can be `allied` while B is `hostile` with the same court). DM proposes updates keyed to the **active** character; engine clamps and persists on that character only. Clergy/NPC agents read **that** PC’s standing for tone. No campaign-level reputation row. |
| 8 | **NPC association:** nullable `faction_id` + `faction_membership_role`. |
| 9 | **Gods interact ⇒ NPC-ify.** First manifestation (or explicit DM proposal) creates/links an NPC with `deity_id` (+ flags such as `is_divine_manifestation`). That NPC uses the normal NPC agent (memories, Social, dossier). Deities who never appear stay pantheon-only rows — **no** create-time NPC for every god. |
| 10 | **Divinity in v1 is narrative + faction systems**, not a boon feat tree. Omens / answered prayers land as narration + world facts + reputation / relation shifts; the manifested god may take actions as an NPC under engine resolution. |
| 11 | **Token discipline (040).** Default slim digests. When `factionPressure = heavy` **or** the turn’s intent/route is intrigue/faith-tagged, allow a **slightly richer** but still capped faction/relation slice — never dump full blurbs every turn. |
| 12 | **Review + hub.** Factions section (summary, pressure, list, relations summary). Religious rows show linked deity name. Hub read-only. Empty legacy = hide. |
| 13 | **Authority boundary.** Agents propose fiction + updates; engine owns keys, FKs, scores, clamps, uniqueness, and NPC-ify idempotency (one living manifestation NPC per deity unless SPEC allows avatars). |
| 14 | **Legacy campaigns.** No mandatory backfill; on-demand mint + NPC-ify still work once shipped. |

## Data model (v1 sketch)

**`factions`**

| Column | Content |
|--------|---------|
| `id` | TEXT PK |
| `campaign_id` | FK → campaigns |
| `key` | Stable slug unique per campaign |
| `name` | Display name |
| `kind` | `civic` \| `military` \| `mercantile` \| `criminal` \| `clandestine` \| `political` \| `religious` \| … |
| `summary` | Short blurb |
| `motivation` / `public_face` / `methods` | Optional short fields (SPEC) |
| `deity_id` | Nullable FK → `deities` (religious / faith-tied) |
| `home_region_id` | Nullable FK → regions |
| `sort_order` | Display order |
| `created_at` | ISO |
| `source` | `campaign_create` \| `dm_play` |

**Campaign fields:** `factions_summary TEXT`, `faction_pressure TEXT` (`light` \| `medium` \| `heavy`).

**`faction_relations`**

| Column | Content |
|--------|---------|
| `id` | TEXT PK |
| `campaign_id` | FK |
| `faction_a_id` / `faction_b_id` | FKs (ordered or undirected per SPEC) |
| `stance` | `ally` \| `rival` \| `tense` \| `secret` \| `war` | …
| `summary` | Optional one-line intrigue hook |
| `updated_at` | ISO |

**`character_faction_reputations`** — composite identity **`(character_id, faction_id)`** (player characters only in v1): `score`, engine `band`, `updated_at`, `last_reason`. Not keyed by `campaign_id` alone.

**`npcs`:** `faction_id`, `faction_membership_role`; **`deity_id`** nullable FK for manifestations (and optionally for mortal clergy who personify a god — SPEC distinguishes manifestation vs priest via flag/`kind`).

Exact indexes, cascades, band thresholds, and manifestation idempotency land in **125.1** / **125.2** / **125.8**.

## Reputation & intrigue rules (v1)

- **Scope:** per **player character × faction** only. Switching active cast members does not inherit the other PC’s standings.
- Default standing: **neutral** (no row until first update for that pair).
- Prefer **deltas**; clamp per-turn magnitude so one beat cannot jump hostile→allied.
- Harming a temple, exposing a conspiracy, or aiding a rival should commonly emit reputation and/or relation updates for the **acting PC** (DM-proposed, engine-persisted).
- NPC agents **read** the active PC’s standing with their faction; they do not write reputation.
- Heavy-pressure campaigns: story-thread / quest seeding **may** surface at least one intrigue or faith-conflict hook (soft expectation in prompts + contract fixtures — not a hard fail if the model under-delivers once).

## Gods-as-NPCs rules (v1)

- Trigger: DM `deityManifestation` / `npcProposals` with `deityId`, or equivalent narration side effect when a god personally interacts.
- Engine: resolve deity → find existing manifestation NPC or create one (name/epithet from deity row; disposition/temperament from tenets/domains; `can_speak = true`; faction often the primary religious org for that deity when one exists).
- Thereafter: normal Social / scene / combat eligibility under existing rules; dossier works (**105**).
- Forgotten gods can manifest as cult-touched or hollow remnants — still NPC rows, still engine-bound.

## Definition of done

- Create pipeline generates pressure-weighted factions including religious orgs linked to deities when appropriate; relations persisted; NPCs may join factions (incl. clergy)
- Review + hub surface factions, pressure, relations, deity links; legacy empty hidden
- Play: mint factions, update reputation/relations; values survive restart
- God interaction NPC-ifies idempotently; manifested god uses NPC agent path
- Play grounding: slim faction/relation/reputation (+ surgical pantheon) without blowing **040** budgets
- Political intrigue playpath supported by data + prompts (not merely flavor text)
- Contract + unit tests; create checklist for create-touching tickets
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

125.1 SPEC + shared types · 125.2 DB + repositories · 125.3 Create-time factions (+ pressure, faiths, relations) · 125.4 NPC association + clergy · 125.5 Review + hub UI · 125.6 DM play proposals (mint, reputation, relations) · 125.7 Play grounding (factions + surgical pantheon) · 125.8 Deity NPC-ification · 125.9 Intrigue playpath verification + smoke

## Relationship to other epics

| Epic / code | Integration |
|-------------|-------------|
| **059** | Consumes `deities` / `pantheon_summary`; religious `deity_id`; surgically lands deferred play-time pantheon grounding |
| **054** / create checklist | New stage + fixtures + contract tests |
| **052** / flagged NPC | Membership + clergy assignment |
| **011** | Manifestation creation mirrors promotion/idempotent NPC ensure patterns |
| **006** / **083** | Tag alignment to faction `key`; optional RAG boost |
| **045** | Proposal validation patterns |
| **038** / **105** | Hub section; dossier may show faction / divine flag (stretch OK) |
| **040** / **112** | Budgeted digests; purpose tags for new LLM calls |
| **124** | No dependency |

## Out of scope (v1)

- Full mechanical divine boon / domain-spell progression for Clerics
- Tick-based war clocks, automated coup resolution, or grand strategy layer
- Player onboarding “pick a patron deity” step (candidate follow-up)
- Rewriting historical free-text `faction_tag` rows into FKs
- Faction / deity portrait image gen (**m001** / **122**)
- Multiplayer-shared reputation (**m002**)
- Creating an NPC for every deity at campaign create

## Sub-tickets

### 125.1 SPEC + shared types

#### Description

Document factions (kinds, pressure bands, religious/`deity_id`), relations, reputation, NPC membership, deity manifestation → NPC rules, proposal schemas, and slim vs enriched digest budgets under `src/shared/factions/` (and deity manifestation types as needed).

#### Acceptance criteria

- [x] SPEC locks pressure bands, kinds, relation stances, reputation clamps, manifestation idempotency
- [x] SPEC states narrative-first divinity (no boon economy) and intrigue-as-playpath expectations
- [x] Shared TS types exported for DB/IPC/agents
- [x] SPEC notes `world_facts.faction_tag` coexistence + `quest_hook` unchanged

### 125.2 DB migration + repositories

#### Description

Migrations for `factions`, `faction_relations`, `character_faction_reputations`, campaign `factions_summary` / `faction_pressure`, NPC `faction_id` / `faction_membership_role` / `deity_id` (+ manifestation flag if needed). Repositories + campaign-delete cascade. Tests for isolation and defaults.

#### Acceptance criteria

- [x] Safe on existing saves; legacy = zero factions
- [x] Repo tests: factions, relations, reputation upsert/clamp, NPC FKs, deity link
- [x] Reputation isolation test: updates for character A never change character B’s row for the same faction
- [x] Campaign delete cascades faction graph + reputations

### 125.3 Create-time faction stage (pressure, faiths, relations)

#### Description

Staged generation after world with pantheon context: emit `factionPressure`, roster, religious links, and relations. Persist + progress stage/copy. Fixtures + **campaign create contract tests** per runbook.

#### Acceptance criteria

- [x] Pressure-weighted roster counts respected after normalize
- [x] When deities exist, ≥1 religious faction in medium/heavy (SPEC may soften for light)
- [x] Religious factions reference valid `deity_id`s when claimed
- [x] Relations persist; contract tests updated; create checklist satisfied for this scope

### 125.4 NPC association + clergy binding

#### Description

Extend NPC generate/normalize/persist (create + flagged) for faction membership; bias clergy toward religious factions when appropriate. Invalid keys dropped without orphan FKs.

#### Acceptance criteria

- [x] Prompts receive slim faction roster (incl. faith ↔ deity names)
- [x] Persist attaches valid membership; unknown keys ignored safely
- [x] Tests: assign / ignore-unknown / religious bias policy per SPEC

### 125.5 Review + hub UI

#### Description

Factions section: summary, pressure indicator, list (kind + deity name for faiths), short relations readout. Hub read-only. Hide when empty.

#### Acceptance criteria

- [x] Review populated after create; hub read-only path works
- [x] Religious rows show linked deity label
- [x] Component tests: empty vs light vs heavy fixtures

### 125.6 DM play: mint, reputation, relations

#### Description

Narration schema + side effects: `factionProposals`, `reputationUpdates`, `relationUpdates`, `npcFactionUpdates`. Validate, clamp, persist. Expose on detail/hub/IPC as needed.

#### Acceptance criteria

- [x] Mint + reputation + relation updates restart-safe
- [x] Reputation updates require `characterId` (active PC); apply only to that character’s faction row
- [x] Unknown FKs rejected; deltas clamped
- [x] Stub-provider integration tests; purpose tagging per **112**

### 125.7 Play grounding (factions + surgical pantheon)

#### Description

Thread slim faction/relation/reputation digests into DM (+ NPC when member). When turn is faith/divine-relevant or pressure is heavy, include compact pantheon digest (closes **059** play-grounding deferral without full tenets every turn). Assert budget caps.

#### Acceptance criteria

- [x] Default path stays within **040**-style size assertions
- [x] Enriched path only when SPEC triggers say so
- [x] NPC members see PC standing with their faction
- [x] Tests for inclusion/exclusion triggers

### 125.8 Deity NPC-ification

#### Description

Idempotent ensure-NPC-for-deity on manifestation proposal: create/link NPC, optional religious faction membership, wire into Social/scene like other NPCs. No duplicate manifestations for the same deity (per SPEC).

#### Acceptance criteria

- [x] First manifestation creates NPC bound to `deity_id`; second reuses same NPC
- [x] Manifested deity can appear in Social with NPC agent grounding
- [x] Unit/integration tests for idempotency + missing deity rejection
- [x] Forgotten-god manifestation path covered (fixture)

### 125.9 Intrigue playpath verification + smoke

#### Description

End-to-end confidence: heavy-pressure create → relations visible → play shifts reputation by aiding a rival → temple slight updates religious standing → god manifests once → restart integrity. Smoke notes + full delivery gate including `act`.

#### Acceptance criteria

- [ ] Automated tests cover pressure/relations/reputation/manifestation persistence across reopen
- [ ] Smoke notes document an intrigue-capable loop (court or faith)
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
