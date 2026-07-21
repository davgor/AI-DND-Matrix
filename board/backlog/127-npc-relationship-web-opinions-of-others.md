# EPIC: NPC relationship web — opinions of others (105 follow-up)

Epic **105** shipped the NPC dossier with a single opinion: **how this NPC feels about the active player**. That is enough for “what does the blacksmith think of me?” but not for intrigue, jealousy, or “why does Mara hate the captain?” — the follow-up called out in **105** / `src/shared/npcDossier/SPEC.md`.

This epic extends dossiers into a **relationship web**:

1. **Multi-subject opinions** — an NPC can hold a persisted opinion toward other subjects (other player characters; other known NPCs).
2. **Dossier affordances** — browse opinions beyond “about you” without leaving the dossier shell.
3. **Relationship web view** — a player-facing graph/list of known opinion edges so political and personal ties are scannable (complements faction reputation in **125**, does not replace it).

Builds on **105** (dossier + player opinion + watermarks), **006** (NPC memory isolation), **038** (multi-PC cast), **085** (Social entry), **121** (known-NPC candidate signals). **126** rules-debt epic explicitly defers opinion-of-others / web UI here.

## Target UX

```
NpcDossierModal (105)
  └── Opinion section
        ├── About you (existing player-subject opinion)
        └── About others… → pick subject (other PC / known NPC)
              └── persisted summary (generate/refresh per watermark)

Relationship web (new entry: dossier footer / sheet People / hub cast)
  └── Nodes = known NPCs (+ optional PC nodes)
  └── Edges = opinion band or short stance label when an opinion exists
        └── activate node → open that NPC’s dossier
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Subjects in v1:** (a) other **player characters** in the same campaign; (b) other **NPCs** in the known-candidate set (same spirit as **121**: log-book-linked and/or dossier-known — no spoiler web of the full cast). |
| 2 | **Storage:** opinions keyed by `(npcId, subjectType, subjectId)` with summary + `generatedAt` + per-subject interaction/relevance watermark. Migrate or coexist with legacy player-only columns (`opinionSummary` on `npcs`) — SPEC locks migration (treat legacy row as subject = active-player-shaped default). |
| 3 | **Generation isolation (**006**).** Each opinion call only receives memories/facts allowed for the **opinion-holder** NPC. Never inject another NPC’s private `npc_memories`. |
| 4 | **Refresh rules.** Same freshness idea as **105**: regenerate only when the watermark says the holder has new relevant interaction involving that subject (SPEC defines bump points). No LLM on every open. |
| 5 | **Web is derived, not a second truth.** Edges come from persisted opinions (and optional disposition shorthand). No separate hand-authored graph table required in v1 beyond opinion rows (+ maybe cached band). |
| 6 | **Entry points:** dossier “about others”; plus one dedicated **Relationship web** surface (modal or sheet panel). Opening a node reuses `NpcDossierModal`. |
| 7 | **Bands for the web.** Engine or deterministic map from summary is optional; v1 may show edge presence + short stance chip (`warm` / `wary` / `hostile` / `unknown`) if the generator emits a structured stance alongside prose — SPEC picks one. Faction reputation (**125**) stays separate. |
| 8 | **Player-facing only for known edges.** Do not show opinions the player has no in-world reason to access — web limited to NPCs the active character “knows” (candidate set) and opinions already generated or explicitly requested from a dossier they can open. |

## Definition of done

- NPC can persist opinions toward other PCs and known NPCs; player-self opinion still works
- Dossier can view opinion-about-other-subject without breaking Traits/Facts/Disposition
- Relationship web lists/graphs known edges; node opens dossier
- Isolation + watermark tests; no full-cast spoiler web
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

127.1 SPEC + types · 127.2 Opinion store migration · 127.3 Generate/refresh multi-subject · 127.4 Dossier UX · 127.5 Relationship web UI · 127.6 Tests + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **105** | Extends dossier opinion contract; updates `npcDossier/SPEC.md` |
| **006** | Memory isolation on every generate path |
| **038** | Other PCs as subjects |
| **121** | Known-NPC candidate set for web nodes / NPC subjects |
| **125** | Faction standing ≠ personal opinion; may deep-link later, not required |
| **126** | Rules debt defers this whole concern here |
| **128** | Scene/Social links open dossiers; web is a separate surface |

## Out of scope (v1)

- Opinions of / toward **factions** (use **125** reputation)
- Force-directed physics toys as a must-have (simple list + edge chips is enough if a graph is costly)
- Editing opinions by the player
- Telepathy: showing an NPC’s private opinion of someone the player never met
- Replacing disposition string with the web

## Sub-tickets

### 127.1 SPEC + shared types

#### Description

Extend `src/shared/npcDossier/` (or `src/shared/npcRelationships/`) with multi-subject opinion schema, watermark bump rules, known-candidate set for web nodes, and stance/band rules if any.

#### Acceptance criteria

- [ ] SPEC replaces “player-only opinion” decision with multi-subject rules
- [ ] Types for `OpinionSubject` / opinion row / web edge DTO exported
- [ ] Isolation and anti-spoiler rules explicit

### 127.2 Opinion store + migration

#### Description

Persist multi-subject opinions; migrate legacy `opinionSummary` / timestamps into the player-subject row for each NPC. Repository list-by-npc, get(npc, subject), upsert.

#### Acceptance criteria

- [ ] Existing saves keep “about you” opinion after migration
- [ ] Isolation: opinion A→B never returned as A→C
- [ ] Campaign delete cascades

### 127.3 Generate / refresh multi-subject opinions

#### Description

Agent + IPC: generate opinion for `(npc, subject)` with isolation; refresh only when watermark requires. Reuse **105** purpose tagging / metering patterns (**112**).

#### Acceptance criteria

- [ ] Stub-provider tests for first generate + skip-when-fresh + regenerate-when-stale
- [ ] Context assembly excludes other NPCs’ private memories
- [ ] Other-PC and other-NPC subject paths both covered

### 127.4 Dossier UX — about others

#### Description

Opinion section: default “About you”; control to choose another known subject; loading/empty states; disposition unchanged.

#### Acceptance criteria

- [ ] Component tests for subject switch + empty “no opinion yet”
- [ ] Same modal shell; no second dossier type
- [ ] Opening from Social still lands on about-you by default

### 127.5 Relationship web UI

#### Description

Player-facing web/list of known NPC nodes and opinion edges; activate node → dossier. Entry from dossier and one sheet/hub affordance (SPEC picks).

#### Acceptance criteria

- [ ] Only known-candidate NPCs appear as nodes
- [ ] Edges only when an opinion row exists (or explicit empty state)
- [ ] Component tests for empty campaign vs multi-edge fixture

### 127.6 Verification + smoke

#### Description

Cross-PC opinion + NPC↔NPC opinion + web → dossier smoke notes; full delivery gate including `act`.

#### Acceptance criteria

- [ ] Restart persistence verified in tests
- [ ] Smoke notes: open web, open edge/node, switch dossier subject
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
