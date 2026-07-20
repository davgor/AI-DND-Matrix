# NPC dossier modal — contract

Clicking an NPC avatar in Social (epic **085**) or opening a linked People entry in the log book opens an **NpcDossierModal** scoped to one `npcId`. Section order is binding: **Traits → Facts → Opinion → Disposition**.

Builds on Social avatars (**085**), identity traits (**052** / **051** / **068**), log book (**025** / **044**), NPC memory isolation (**006**), and modal/IPC patterns (**046** / **045**). Complements backlog **083** (RAG) — see optional upgrade below.

Shared DTOs live in `src/shared/npcDossier/types.ts`. Schema + IPC land in **105.2**; opinion agent + watermark bumps in **105.5**; UI + entry points in **105.3–105.6**.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Facts = known facts only.** Player-discovered log book rows with `relatedEntityId = npcId` (any category; content must be about this NPC). Not omniscient backstory, `world_facts`, or raw `npc_memories`. |
| 2 | **NPC-scoped content only.** Every section filters to the dossier subject (`npcId`). No other NPCs, no unrelated log entries. |
| 3 | **Persisted opinion summary.** On open: return the stored summary unless the player has new interaction with this NPC since last generation. No live LLM on every open when nothing changed. |
| 4 | **Two entry points (v1):** Social NPC avatar/name **and** log book People entry linked to an NPC. |
| 5 | **Same modal for non-speakers.** `canSpeak: false` uses the same layout; opinion grounding uses observed **actions**, not dialogue/memories from speech. |
| 6 | **NPC-scoped opinion (v1).** Opinion summarizes this NPC's view of **the player** only. Opinions toward other characters are out of scope. |

## Section sources

| Section | Purpose | Source |
|---------|---------|--------|
| **Traits** | Identity bundle | NPC row: temperament, race, alignment, gender, class, background, role — Campaign Review trait labeling |
| **Facts** | Known information | Active character log book entries where `relatedEntityId = npcId`; title + content; newest-first |
| **Opinion** | How this NPC feels about the player | Persisted `opinionSummary`; regenerate only when watermark requires |
| **Disposition** | How they treat the player | `npcs.disposition` |

Const: `DOSSIER_SECTION_ORDER = ['traits', 'facts', 'opinion', 'disposition']`.

Empty sections keep their heading and show an empty state (e.g. "No facts recorded yet").

## Opinion persistence fields

Store per NPC (campaign-scoped columns on `npcs` or a dedicated table keyed by `npc_id`):

| Field | Purpose |
|-------|---------|
| `opinionSummary` | DM-voiced paragraph (nullable until first generation) |
| `opinionSummaryGeneratedAt` | When the summary was last written |
| `lastPlayerInteractionAt` | Watermark: last turn/event where the active campaign player interacted with this NPC |

Helper: `needsOpinionRegeneration(fields)` —

1. `opinionSummary` is null → **true** (generate once)
2. `lastPlayerInteractionAt <= opinionSummaryGeneratedAt` (or interaction null with existing summary) → **false** (return stored; no LLM)
3. `lastPlayerInteractionAt > opinionSummaryGeneratedAt` → **true** (regenerate and persist)

## Interaction watermark bump rules

Bump `lastPlayerInteractionAt` to the current turn timestamp when the player meaningfully engages that NPC:

| NPC type | Counts as interaction |
|----------|----------------------|
| Speaking (`canSpeak: true`) | Social dialogue lines involving this NPC; `npc_memories` appended for this NPC from a player-facing turn |
| Non-speaking | Scene/combat **action** entries involving this NPC (not dialogue) |

Exact turn-pipeline hooks: converse beat targeting the NPC, action targeting them, combat engagement with them. Do **not** bump for passive presence in a region or unrelated scene narration.

## Opinion grounding (generation context)

| NPC type | Grounding inputs (recency-capped; slim token budget — epic **040**) |
|----------|---------------------------------------------------------------------|
| Speaking | This NPC's `npc_memories` **only** (isolation — epic **006**) + recent dialogue involving this NPC and the player |
| Non-speaking | Observed action/scene beats involving this NPC — **no** dialogue, **no** other NPCs' memories |

Never inject another NPC's private memories. Never invent backstory beyond stored traits + grounding window.

## Entry points

```
Social stream — click NPC avatar or name affordance (PlayLogEntry.npcId)
Log book — People entry with relatedEntityId resolving to an NPC → same modal
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
- NPC opinions of other characters
- Manual "refresh opinion" button
- Present-NPC list / Scene / Campaign Review entry points
