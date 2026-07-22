# NPC relationship web — multi-subject opinions (epic **127**)

Extends the NPC dossier (**105**) beyond a single “about you” opinion into a **relationship web**: each NPC may hold persisted opinions toward other subjects, and a player-facing web lists known opinion edges.

Builds on dossier opinion + watermarks (**105**), NPC memory isolation (**006**), multi-PC cast (**038**), and journal known-candidate signals (**121**). Complements faction reputation (**125**) — personal opinion ≠ faction standing.

Shared DTOs: `src/shared/npcRelationships/types.ts`. Persistence: `npc_opinions` table. Dossier UX + web UI live under `src/renderer/src/npcDossier/` and `src/renderer/src/relationshipWeb/`.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Subjects in v1:** (a) other **player characters** in the same campaign; (b) other **NPCs** in the **121** known-candidate set (log-book–linked and/or dossier-generated). No full-cast spoiler list. |
| 2 | **Storage:** rows keyed by `(npcId, subjectType, subjectId)` with `summary`, `generatedAt`, `lastRelevantInteractionAt`, and optional `stance`. Legacy `npcs.opinionSummary` / timestamps migrate into the **player-character** subject row for the campaign’s first player character; dual-write keeps journal dossier-known lists working. |
| 3 | **Generation isolation (**006**).** Each opinion call receives only the **holder** NPC’s allowed memories / action beats. Never inject another NPC’s private `npc_memories`. |
| 4 | **Refresh.** Regenerate only when `needsOpinionRegeneration` says so for that subject row (null summary → generate; watermark after `generatedAt` → regenerate). No LLM on every open. |
| 5 | **Web is derived.** Edges come from persisted opinion rows (plus stance chip). No separate hand-authored graph table. |
| 6 | **Entry points:** dossier Opinion “About others…”; dossier footer opens **Relationship web**. Opening a web node reuses `NpcDossierModal`. Play-sheet hub entry may wire later. |
| 7 | **Stance bands:** generator may emit `warm` / `wary` / `hostile` / `unknown` alongside prose. Web shows edge presence + stance chip. Faction reputation stays separate. |
| 8 | **Player-facing known edges only.** Web nodes = known-candidate NPCs (+ optional other PC nodes). Edges only when an opinion row exists for a holder the player can open. |

## Opinion subject

```ts
subjectType: 'player_character' | 'npc'
subjectId: string  // characters.id or npcs.id
```

Default dossier open lands on **About you** = `{ subjectType: 'player_character', subjectId: activeCharacterId }`.

## Watermark bump rules (per subject)

Bump `lastRelevantInteractionAt` on the opinion row when the holder has a new **relevant** interaction involving that subject:

| Subject | Counts as interaction |
|---------|----------------------|
| Active / other PC | Dialogue or actions involving the holder and that character (same spirit as **105** player watermark) |
| Other NPC | Observable beats where holder and subject NPC co-occur (scene/combat/social) — not passive co-presence alone |

Caller: `bumpNpcOpinionSubjectInteraction`. Turn-pipeline hooks may call this; dossier generate/read does not invent bumps.

## Isolation + anti-spoiler

- Context assembly for generate: **holder** memories only (`listNpcMemoriesByNpc(holderId)`), never another NPC’s private memories.
- Subject pickers and web nodes: **121** known-candidate NPCs + other campaign PCs only. Never the full NPC roster.
- Do not surface an opinion the player has no dossier path to request (web limited to known holders/subjects).

## Relationship web DTO

| Field | Meaning |
|-------|---------|
| `nodes` | Known NPCs (+ optional other PCs) the active character may see |
| `edges` | `{ fromNpcId, subjectType, subjectId, stance, hasSummary }` derived from opinion rows |

Empty campaign → empty nodes + empty edges (explicit empty state in UI).

## Out of scope (v1)

- Opinions of / toward factions (**125**)
- Force-directed graph physics (list + edge chips is enough)
- Player editing of opinions
- Showing private opinions about people the player never met
