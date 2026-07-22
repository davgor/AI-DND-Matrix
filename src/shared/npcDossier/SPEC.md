# NPC dossier modal — contract

Clicking an NPC avatar in Social (epic **085**) or opening a linked People entry in the log book opens an **NpcDossierModal** scoped to one `npcId`. Section order is binding: **Traits → Facts → Opinion → Disposition**.

Builds on Social avatars (**085**), identity traits (**052** / **051** / **068**), log book (**025** / **044**), NPC memory isolation (**006**), and modal/IPC patterns (**046** / **045**). Complements backlog **083** (RAG) — see optional upgrade below. Multi-subject opinions and the relationship web are defined in epic **127** / `src/shared/npcRelationships/SPEC.md`.

Shared DTOs live in `src/shared/npcDossier/types.ts`. Schema + IPC land in **105.2**; opinion agent + watermark bumps in **105.5**; UI + entry points in **105.3–105.6**. Multi-subject store + web: **127**.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Facts = known facts only.** Player-discovered log book rows with `relatedEntityId = npcId` (any category; content must be about this NPC). Not omniscient backstory, `world_facts`, or raw `npc_memories`. |
| 2 | **NPC-scoped content only.** Traits / Facts / Disposition filter to the dossier subject (`npcId`). Opinion may browse **other subjects** (other PCs / known NPCs) per **127** without injecting other NPCs’ private memories. |
| 3 | **Persisted opinion summary.** On open: return the stored summary unless the watermark for that subject requires regeneration. No live LLM on every open when nothing changed. |
| 4 | **Two entry points (v1):** Social NPC avatar/name **and** log book People entry linked to an NPC. |
| 5 | **Same modal for non-speakers.** `canSpeak: false` uses the same layout; opinion grounding uses observed **actions**, not dialogue/memories from speech. |
| 6 | **Multi-subject opinion (**127**).** Default open shows this NPC’s view of **the active player**. The Opinion section can switch to other PCs and known-candidate NPCs. Opinions are keyed by `(npcId, subjectType, subjectId)`. |

## Section sources

| Section | Purpose | Source |
|---------|---------|--------|
| **Traits** | Identity bundle | NPC row: temperament, race, alignment, gender, class, background, role — Campaign Review trait labeling |
| **Facts** | Known information | Active character log book entries where `relatedEntityId = npcId`; title + content; newest-first |
| **Opinion** | How this NPC feels about a chosen subject | Persisted `npc_opinions` row (legacy `opinionSummary` = player-subject); regenerate only when watermark requires |
| **Disposition** | How they treat the player | `npcs.disposition` |

Const: `DOSSIER_SECTION_ORDER = ['traits', 'facts', 'opinion', 'disposition']`.

Empty sections keep their heading and show an empty state (e.g. "No facts recorded yet").

## Opinion persistence fields

Legacy columns on `npcs` (still dual-written for journal **121** dossier-known lists):

| Field | Purpose |
|-------|---------|
| `opinionSummary` | DM-voiced paragraph for the **player** subject (nullable until first generation) |
| `opinionSummaryGeneratedAt` | When the player-subject summary was last written |
| `lastPlayerInteractionAt` | Watermark: last turn/event where the active campaign player interacted with this NPC |

Canonical multi-subject store: `npc_opinions` — see `src/shared/npcRelationships/SPEC.md`.

Helper: `needsOpinionRegeneration(fields)` —

1. `opinionSummary` is null → **true** (generate once)
2. `lastPlayerInteractionAt <= opinionSummaryGeneratedAt` (or interaction null with existing summary) → **false** (return stored; no LLM)
3. `lastPlayerInteractionAt > opinionSummaryGeneratedAt` → **true** (regenerate and persist)

Same rule applies per subject via `needsSubjectOpinionRegeneration`.

## Interaction watermark bump rules

Bump `lastPlayerInteractionAt` (and the matching player-subject opinion row) to the current turn timestamp when the player meaningfully engages that NPC:

| NPC type | Counts as interaction |
|----------|----------------------|
| Speaking (`canSpeak: true`) | Social dialogue lines involving this NPC; `npc_memories` appended for this NPC from a player-facing turn |
| Non-speaking | Scene/combat **action** entries involving this NPC (not dialogue) |

Exact turn-pipeline hooks: converse beat targeting the NPC, action targeting them, combat engagement with them. Do **not** bump for passive presence in a region or unrelated scene narration.

Other-subject bumps: see relationship SPEC (`bumpNpcOpinionSubjectInteraction`).

## Opinion grounding (generation context)

| NPC type | Grounding inputs (recency-capped; slim token budget — epic **040**) |
|----------|---------------------------------------------------------------------|
| Speaking | This NPC's `npc_memories` **only** (isolation — epic **006**) + recent dialogue involving this NPC and the subject when available |
| Non-speaking | Observed action/scene beats involving this NPC — **no** dialogue, **no** other NPCs' memories |

Never inject another NPC's private memories. Never invent backstory beyond stored traits + grounding window. Subject identity (name / type) is labeled in the prompt; grounding stays holder-scoped.

## Entry points

```
Social stream — click NPC avatar or name affordance (PlayLogEntry.npcId)
Log book — People entry with relatedEntityId resolving to an NPC → same modal
Dossier Opinion — About you (default) / About others… (127)
Dossier footer — Relationship web (127) → node → same modal
```

Player lines and non-NPC entries must not open an NPC dossier.

## Optional later upgrade — RAG (**083**)

**105 does not block on 083; 083 does not block on 105.**

| Concern | Needs 083? |
|---------|------------|
| Traits + Disposition display | No |
| Facts from log book by `relatedEntityId` | No |
| Opinion for early/short campaigns | No (recency-capped memories / action beats) |
| Opinion / fact selection in long campaigns | Benefits after **083** (semantic retrieval when history exceeds the window) |

## Out of scope (v1)

- Editing traits, facts, disposition, or opinion from the modal
- Portrait / generated NPC images
- Party-member dossiers
- Campaign Review UI changes
- Full chat/action transcript in the modal
- Manual "refresh opinion" button
- Present-NPC list / Scene / Campaign Review entry points
- Opinions of / toward factions (epic **125**)
