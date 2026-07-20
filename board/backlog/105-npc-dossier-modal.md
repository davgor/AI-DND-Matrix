# EPIC: NPC dossier modal — traits, facts, opinion summary, disposition

Clicking an NPC's avatar/icon in the Social stream (epic **085**) should open a **dossier modal** that surfaces everything the player (and/or table) needs to know about that character in one place. Today those icons are non-interactive (`social-avatar` is a decorative initial bubble); NPC identity lives on the row + Campaign Review Traits panel (**068** / **052** / **051**), player-facing knowledge lives in the log book People category (**025** / **044**), private conversation history lives in `npc_memories` (**006**), and disposition is a free-text field on the NPC — but nothing ties them together behind the Social avatar.

This epic adds a read-only **Npc dossier** modal opened from Social (and optionally other NPC chrome later): sections for **Traits → Facts → DM opinion summary → Disposition**, in that order.

Builds on **085** (Social avatars), **052** / **051** / **068** (identity traits), **025** / **044** (log book People), **006** (NPC memory isolation), **046** / **045** (modal + IPC patterns). Complements backlog **083** (RAG) — see sequencing below.

## Target UX

```
Social stream
  └── Click NPC avatar (or name affordance)
        │
        ▼
NpcDossierModal (ModalPortal)
  ├── Header: NPC name + role
  ├── Traits          — identity bundle (temperament, race, alignment, …)
  ├── Facts           — known lore / log-book People / related world facts
  ├── Opinion (DM)    — short summary of how this NPC feels about the player,
  │                     grounded in chat / memories
  └── Disposition     — stored disposition string (how they treat the player)
```

Empty sections show a clear empty state (e.g. "No facts recorded yet") rather than hiding the section heading, so the layout stays predictable.

## Section contract (v1)

| Section | Purpose | Likely sources (resolve in 105.1) |
|---------|---------|-----------------------------------|
| **Traits** | Stable identity the player can treat as established once met | NPC row: temperament, race, alignment, gender, class, background, role; reuse Campaign Review trait labeling where possible |
| **Facts** | Discrete known information about the character | Character log book `person` entries with `relatedEntityId = npcId`; optionally region-tagged `world_facts` that mention the NPC; **not** other NPCs' private memories |
| **Opinion (DM summary)** | Narrative read on the NPC↔player relationship from interactions | New LLM (or templated) summary over that NPC's `npc_memories` + Social dialogue involving them; must respect memory isolation |
| **Disposition** | Authoritative "how they treat the player" line | `npcs.disposition` (generation field — one or two sentences) |

**Ordering is binding for UI:** Traits, then Facts, then Opinion summary, then Disposition.

## Sequencing vs RAG epic **083**

**Ship this epic before (or in parallel with) RAG — do not block on 083.**

| Concern | Needs 083? | Why |
|---------|------------|-----|
| Traits + Disposition display | No | Already on the NPC row |
| Facts from log book / tagged rows | No | Direct queries by `npcId` / `relatedEntityId` |
| Opinion summary (early campaigns) | No | Recency-capped `npc_memories` + Social lines match today's agent grounding (**006** / **040**) |
| Opinion / fact selection in long campaigns | **Benefits after 083** | Semantic retrieval over that NPC's memories/facts improves summary quality when history exceeds the window |

Recommendation: implement **105** with recency/tag retrieval first; add an optional follow-up sub-ticket or note under **083** to swap the opinion/facts loader to scoped RAG (`scope: npc`) once **083.6–083.8** land. **083 does not need to wait for 105**, and **105 does not need to wait for 083**.

## Definition of done

- Clicking an NPC Social avatar opens a dossier modal for that NPC
- Modal sections render in order: Traits → Facts → Opinion → Disposition
- Traits reuse established identity labels (aligned with Campaign Review where practical)
- Facts are player-known / campaign-grounded rows linked to the NPC — never another NPC's private memories
- Opinion summary is a DM-voiced short paragraph grounded in that NPC's interaction history; isolation preserved
- Disposition shows the stored NPC disposition field
- IPC + unit/component tests; smoke notes; `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass

105.1 dossier contract + knowledge rules · 105.2 dossier query/IPC · 105.3 Traits + Disposition UI · 105.4 Facts section · 105.5 Opinion summary agent · 105.6 Social avatar click entry · 105.7 tests + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **085** | Primary entry: Social avatar becomes a button/control |
| **052** / **051** / **068** | Trait field set + display labels |
| **025** / **044** | Log book People as Facts source |
| **006** | NPC memory isolation for opinion grounding |
| **046** / **045** | `ModalPortal`, play-sheet modal CSS/IPC patterns |
| **083** (backlog) | Optional later upgrade for opinion/fact retrieval; not a prerequisite |
| **040** | Opinion prompt must stay slim (capped memories / summary length) |

## Out of scope (v1)

- Editing traits, facts, disposition, or opinion from the modal (read-only)
- Portrait / generated images for the avatar (initial letter remains fine)
- Party-member dossiers (player allies) — NPC speakers only unless promoted later
- Campaign Review Traits panel changes (reuse patterns; do not merge UIs)
- Full chat transcript dump inside the modal (summary only; raw lines stay in Social)
- Changing how disposition is authored at generation time

## Open decisions (resolve in 105.1 / with product)

1. **Audience / fog of war:** Is the dossier **player-facing knowledge only** (hide traits/facts not yet revealed in play), a **full omniscient sheet** (everything on the NPC row + memories summarized), or a **hybrid** (full traits once spoken to, facts only from log book)?
2. **Facts source priority:** Log book People only vs also `world_facts` / backstory excerpts / `npc_memories` surfaced as bullets?
3. **Opinion refresh:** On every open (live LLM call), cached until next Social turn with that NPC, or regenerate on demand via a button?
4. **Entry points:** Social avatar only, or also present-NPC list / Scene mentions / Campaign Review?
5. **Non-speakers / creatures:** Same modal with reduced sections, or click disabled for `canSpeak: false`?
6. **Multi-character campaigns:** Opinion/facts scoped to the **active** player character's log book + that PC's interactions, or campaign-global?

## Sub-tickets

### 105.1 Dossier contract + knowledge / isolation rules

#### Description

Write a short SPEC (under `docs/` or `src/shared/npcDossier/`) defining section order, field sources, fog-of-war choice from Open decisions, empty states, and hard isolation: opinion grounding may only use the target NPC's memories + allowed shared facts.

#### Acceptance criteria

- [ ] SPEC documents Traits / Facts / Opinion / Disposition sources and section order
- [ ] SPEC records the fog-of-war decision (player-known vs omniscient vs hybrid)
- [ ] SPEC states NPC memory isolation rules for opinion generation (no cross-NPC leakage)
- [ ] SPEC notes RAG (**083**) as a non-blocking future retrieval upgrade

### 105.2 Dossier query + IPC

#### Description

Add a typed IPC (e.g. `npcDossier:get`) that returns the payload for one `npcId` + active `characterId`: traits view-model, facts list, disposition string, and either a cached opinion or enough context handles for 105.5 to generate one.

#### Acceptance criteria

- [ ] IPC returns structured dossier DTO; missing NPC → clear error / empty
- [ ] Facts query never returns another NPC's `npc_memories`
- [ ] Unit tests cover happy path + isolation + missing NPC

### 105.3 Traits + Disposition sections (UI)

#### Description

Render Traits and Disposition in the modal using shared label helpers where possible (`CampaignReviewNpcTraits` patterns / race-background resolvers). Disposition is its own final section, not buried inside Traits.

#### Acceptance criteria

- [ ] Traits section lists the agreed identity fields with empty-state handling for null keys
- [ ] Disposition section shows `npc.disposition` (or empty state)
- [ ] Component tests cover speaking vs non-speaking / missing optional keys

### 105.4 Facts section

#### Description

List known facts per 105.1 (likely log book People entries linked to the NPC, plus any other approved sources), newest-first or SPEC-defined order.

#### Acceptance criteria

- [ ] Facts section renders linked entries; empty state when none
- [ ] Unit/integration test: log book person entry with `relatedEntityId` appears; unrelated person entries do not

### 105.5 DM opinion summary agent

#### Description

Generate a short DM-voiced summary of the NPC's opinion of the active player from that NPC's memories and/or Social dialogue involving them. Cap input size per **040**; persist or cache per 105.1 refresh decision.

#### Acceptance criteria

- [ ] Prompt/builder + generator with schema validation and slim token budget
- [ ] Isolation test: memories from NPC B never appear in NPC A's opinion prompt
- [ ] Unit tests with scripted provider; failure path shows a safe fallback message in the UI

### 105.6 Social avatar click → open modal

#### Description

Make the Social NPC avatar (and optionally name) an accessible control that opens `NpcDossierModal` for `entry` speaker NPC id. Wire through play-view modal host (peer to spellbook/quest log patterns).

#### Acceptance criteria

- [ ] Click/keyboard activation on NPC avatar opens dossier for that speaker
- [ ] Player / non-NPC avatars do not open an NPC dossier
- [ ] Modal closes via existing overlay/close patterns; focus returns reasonably
- [ ] Component/UI test covers open/close wiring with a stub dossier payload

### 105.7 Tests + smoke runbook

#### Description

Automated coverage for IPC + sections + opinion isolation; short manual smoke: converse with an NPC, open dossier, confirm Traits / Facts / Opinion / Disposition.

#### Acceptance criteria

- [ ] Automated tests cover 105.2–105.6 critical paths
- [ ] Runbook notes (new or section under play Social) for the click → dossier happy path
- [ ] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass when the epic is implemented
