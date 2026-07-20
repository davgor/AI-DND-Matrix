# EPIC: NPC dossier modal — traits, facts, opinion summary, disposition

Clicking an NPC's avatar/icon in the Social stream (epic **085**) or opening them from the log book should open a **dossier modal** scoped entirely to that one NPC: sections for **Traits → Facts → DM opinion summary → Disposition**, in that order. Today Social avatars are non-interactive; NPC identity lives on the row + Campaign Review Traits panel (**068** / **052** / **051**), player-facing knowledge lives in the log book (**025** / **044**), private history lives in `npc_memories` (**006**), and disposition is a free-text field on the NPC — but nothing ties them together.

Builds on **085** (Social avatars), **052** / **051** / **068** (identity traits), **025** / **044** (log book), **006** (NPC memory isolation), **046** / **045** (modal + IPC patterns). Complements backlog **083** (RAG) — see sequencing below.

## Target UX

```
Entry points
  ├── Social stream — click NPC avatar (or name affordance)
  └── Log book — open dossier from a People entry linked to an NPC
        │
        ▼
NpcDossierModal (ModalPortal) — everything scoped to this npcId only
  ├── Header: NPC name + role
  ├── Traits          — identity bundle for this NPC
  ├── Facts           — player-known facts about this NPC only
  ├── Opinion (DM)    — persisted summary of how this NPC feels about the player
  └── Disposition     — stored disposition string (how they treat the player)
```

Empty sections show a clear empty state (e.g. "No facts recorded yet") rather than hiding the section heading.

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Facts = known facts only.** Facts are player-discovered information about this NPC — not omniscient backstory, `world_facts`, or raw `npc_memories`. Primary source: active character log book entries with `relatedEntityId = npcId` (any category, but content must be about this NPC). |
| 2 | **NPC-scoped content only.** The modal shows nothing about other NPCs or unrelated log book entries. Every section is filtered to the dossier subject (`npcId`). |
| 3 | **Persisted opinion summary.** Store the DM opinion summary durably. On open: return the stored summary unchanged unless the player has **new interaction** with this NPC since the summary was last generated. No live LLM call on every open when nothing changed. |
| 4 | **Two entry points (v1):** Social NPC avatar **and** log book (People entry → open dossier for linked NPC). |
| 5 | **Same modal for non-speakers.** `canSpeak: false` creatures use the same layout; opinion grounding uses **observed actions** (combat, movement, scene beats) instead of dialogue/memories from speech. |
| 6 | **NPC-scoped opinion (v1).** Opinion summarizes this NPC's view of **the player** only. Opinions toward other characters (party, other NPCs) are **out of scope for v1** — candidate follow-up. |

## Section contract (v1)

| Section | Purpose | Sources |
|---------|---------|---------|
| **Traits** | Identity bundle for this NPC | NPC row: temperament, race, alignment, gender, class, background, role; reuse Campaign Review trait labeling |
| **Facts** | Known information about this NPC | Active character log book entries where `relatedEntityId = npcId` — title + content only; no other tables in v1 |
| **Opinion (DM summary)** | How this NPC feels about the player | **Persisted** summary; regenerate only when interaction watermark advances (see below) |
| **Disposition** | How they treat the player | `npcs.disposition` |

**Ordering is binding:** Traits → Facts → Opinion → Disposition.

### Opinion persistence + refresh rules

Store per NPC (campaign-scoped row):

| Field | Purpose |
|-------|---------|
| `opinionSummary` | DM-voiced paragraph (nullable until first generation) |
| `opinionSummaryGeneratedAt` | When the summary was last written |
| `lastPlayerInteractionAt` | Watermark: last turn/event where the active campaign player interacted with this NPC |

**On dossier open:**

1. If `opinionSummary` is null → generate once, persist, set both timestamps.
2. If `lastPlayerInteractionAt <= opinionSummaryGeneratedAt` → return stored summary (**no LLM**).
3. If `lastPlayerInteractionAt > opinionSummaryGeneratedAt` → regenerate from new interaction context, persist, update `opinionSummaryGeneratedAt`.

**Interaction watermark sources:**

| NPC type | Counts as interaction |
|----------|----------------------|
| Speaking (`canSpeak: true`) | Social dialogue lines + `npc_memories` appended since last summary |
| Non-speaking | Scene/combat **action** entries involving this NPC (not dialogue) |

Bump `lastPlayerInteractionAt` on the turn pipeline when the player meaningfully engages that NPC (converse beat, action targeting them, etc.) — exact hooks in 105.1 / 105.5.

## Sequencing vs RAG epic **083**

**Ship this epic before (or in parallel with) RAG — do not block on 083.**

| Concern | Needs 083? | Why |
|---------|------------|-----|
| Traits + Disposition display | No | Already on the NPC row |
| Facts from log book | No | Direct query by `relatedEntityId` |
| Opinion summary (early campaigns) | No | Recency-capped memories / recent action beats |
| Opinion / fact selection in long campaigns | **Benefits after 083** | Semantic retrieval when history exceeds the window |

**083 does not need to wait for 105**, and **105 does not need to wait for 083**.

## Definition of done

- Social NPC avatar and log book People entry open the dossier for that NPC
- Sections render in order: Traits → Facts → Opinion → Disposition
- Facts show only player-known log book entries linked to this NPC
- Opinion summary is persisted; unchanged on reopen unless new player↔NPC interaction since last generation
- Non-speaking NPCs use action-based opinion grounding; same modal shell
- Disposition shows stored `npcs.disposition`
- IPC + tests + smoke; `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass

105.1 dossier contract + persistence rules · 105.2 schema + dossier IPC · 105.3 Traits + Disposition UI · 105.4 Facts section · 105.5 Opinion agent + interaction watermark · 105.6 Social + log book entry points · 105.7 tests + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **085** | Social avatar click entry |
| **025** / **044** | Log book People entry → dossier; Facts source |
| **052** / **051** / **068** | Trait labels |
| **006** | NPC memory isolation for speaking opinion grounding |
| **046** / **045** | Modal + IPC patterns |
| **083** (backlog) | Optional later retrieval upgrade |
| **040** | Opinion prompt stays slim |

## Out of scope (v1)

- Editing traits, facts, disposition, or opinion from the modal
- Portrait / generated NPC images
- Party-member dossiers
- Campaign Review UI changes
- Full chat/action transcript in the modal (summary only)
- NPC opinions of **other** characters (party, other NPCs) — follow-up epic
- Regenerating opinion on demand via a manual refresh button
- Present-NPC list / Scene / Campaign Review entry points

## Sub-tickets

### 105.1 Dossier contract + persistence rules

#### Description

SPEC under `docs/` or `src/shared/npcDossier/`: section order, NPC-only filtering, Facts = log book `relatedEntityId`, opinion persistence fields, interaction watermark bump points, speaking vs non-speaking grounding.

#### Acceptance criteria

- [ ] SPEC documents Traits / Facts / Opinion / Disposition sources and locked product decisions above
- [ ] SPEC defines interaction watermark bump rules (dialogue vs action paths)
- [ ] SPEC states NPC memory isolation for speaking opinion generation
- [ ] SPEC notes RAG (**083**) as optional later upgrade

### 105.2 Schema + dossier query IPC

#### Description

Migration for persisted opinion fields on NPC (or dedicated table keyed by `npc_id`). IPC `npcDossier:get` returns traits, facts (log book slice), disposition, stored opinion (generating only when watermark requires).

#### Acceptance criteria

- [ ] Schema stores `opinionSummary`, `opinionSummaryGeneratedAt`, `lastPlayerInteractionAt` per NPC
- [ ] IPC returns dossier DTO; regenerates opinion only when `lastPlayerInteractionAt > opinionSummaryGeneratedAt`
- [ ] Reopen without new interaction returns identical stored summary (unit test)
- [ ] Facts query returns only log book rows with `relatedEntityId = npcId` for the active character
- [ ] Unit tests: isolation, missing NPC, stale vs fresh watermark

### 105.3 Traits + Disposition sections (UI)

#### Description

Render Traits and Disposition; reuse Campaign Review label helpers. Disposition is the final section.

#### Acceptance criteria

- [ ] Traits list identity fields with empty states for null keys
- [ ] Disposition shows `npc.disposition`
- [ ] Component tests: speaking vs non-speaking

### 105.4 Facts section

#### Description

List log book entries linked to this NPC only (`relatedEntityId = npcId`), newest-first.

#### Acceptance criteria

- [ ] Facts section shows linked entries only; empty state when none
- [ ] Unrelated log book entries never appear
- [ ] Unit test: linked person entry appears; unrelated entries do not

### 105.5 Opinion summary agent + interaction watermark

#### Description

DM-voiced summary generator; speaking NPCs ground on dialogue + `npc_memories`; non-speakers ground on **actions** only. Turn pipeline bumps `lastPlayerInteractionAt` when the player engages the NPC.

#### Acceptance criteria

- [ ] Prompt/builder + generator with slim token budget (**040**)
- [ ] Speaking path uses that NPC's memories only (isolation test)
- [ ] Non-speaking path uses action/scene signals, not dialogue
- [ ] Watermark bump wired on relevant turns; regeneration only after new interaction
- [ ] Scripted-provider tests + safe UI fallback on generation failure

### 105.6 Entry points — Social avatar + log book

#### Description

Social: NPC avatar/name opens dossier. Log book: People entry with `relatedEntityId` resolving to an NPC opens the same modal.

#### Acceptance criteria

- [ ] Social NPC avatar/name opens dossier for that speaker's `npcId`
- [ ] Log book People entry affordance opens dossier when linked to an NPC
- [ ] Player lines / non-NPC entries do not open NPC dossier incorrectly
- [ ] Modal close/focus behavior matches existing play-sheet modals
- [ ] Component tests for both entry paths

### 105.7 Tests + smoke runbook

#### Description

Automated coverage + manual smoke: converse (or act with non-speaker), open dossier, reopen without new interaction → same opinion; new interaction → opinion updates.

#### Acceptance criteria

- [ ] Tests cover 105.2–105.6 critical paths including persistence idempotency
- [ ] Runbook covers Social + log book entry and opinion refresh behavior
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass when implemented
