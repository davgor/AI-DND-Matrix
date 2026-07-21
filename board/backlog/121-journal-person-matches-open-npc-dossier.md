# EPIC: Journal person matches open NPC dossier (+ dossier-known NPCs in journal)

Epic **105** shipped the NPC dossier modal and wired two entry points: Social avatar/name, and **log book** People entries that already carry `relatedEntityId`. The **character journal** (epic **027**) still renders free-text diary prose with no entity linking — names of known NPCs are plain text. Separately, an NPC can already have a **generated dossier** (persisted `opinionSummary` from **105**) without a matching log-book People row or any journal affordance, so the player cannot rediscover that dossier from the Journal tab alone.

This epic closes that loop: **person matches in the journal open that NPC’s dossier**, and **NPCs whose dossier has already been generated also appear in the journal surface** so they remain reachable there.

Builds on **027** (journal), **025** / **044** (log book People), **105** (dossier modal + opinion persistence), **043** (Journal tab / play-sheet modals), **030** (FormattedText — extend, don’t fork).

## Target UX

```
Journal feed (027)
  └── Entry prose may contain NPC name matches
        │  click / activate matched name
        ▼
NpcDossierModal (105) — same modal as Social / log book

Journal surface also lists “known dossiers”
  └── NPCs with opinionSummary already generated
        │  open dossier (same modal)
        ▼
      (optional) jump to / highlight matching journal mentions
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Match target = campaign NPCs the active character can reasonably know.** Prefer NPCs already linked via log-book People (`relatedEntityId`) and/or NPCs with a generated dossier (`opinionSummary` not null). Do not link every campaign NPC name blindly (avoids spoiling unencountered cast). Exact candidate set is specified in 121.1. |
| 2 | **Matching is name-based in journal prose.** Case-insensitive whole-word (or equivalent boundary-safe) match on NPC display names; longest-name-first when one name is a prefix of another. Ambiguous duplicate names: prefer `relatedEntityId` / dossier-known candidate; if still tied, do not link (no wrong-NPC open). |
| 3 | **Same dossier modal as 105.** Journal matches and the “dossier-known” list both call the existing open path (`npcId` → `NpcDossierModal`). No second modal or journal-only dossier UI. |
| 4 | **Dossier-generated ⇒ appears in journal.** Any NPC with a persisted generated opinion summary (`opinionSummary` / `opinionSummaryGeneratedAt` set) appears in a journal-side list/section (e.g. “People you’ve read about” / known dossiers), even if there is not yet a log-book People row. Opening from that list uses the same dossier modal. |
| 5 | **Log book People without `relatedEntityId` stay out of v1 unless cheap.** Epic **105** already opens dossiers for linked People rows. Unlinked People title→NPC name resolution may be noted as follow-up; this epic owns **journal** matching + dossier-known surfacing. |
| 6 | **Read-only linking.** No editing journal text to insert markup; matching is computed at render/query time from current NPC roster + dossier/log-book signals. |

## Definition of done

- Journal entry text highlights/activates matched NPC names; activating opens that NPC’s dossier
- NPCs with a generated dossier appear in the journal surface list and open the same dossier modal
- Unmatched / ambiguous / unknown names remain plain text
- No spoiler links for NPCs outside the locked candidate set
- Unit + component tests for matcher, candidate set, and open wiring; smoke notes for Journal → dossier
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

121.1 match + candidate-set SPEC · 121.2 name matcher + tests · 121.3 journal render + open dossier · 121.4 dossier-known NPCs in journal list · 121.5 play-sheet wiring + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **027** | Journal feed content is the primary match surface |
| **105** | Reuse `NpcDossierModal` / IPC / opinion “generated” signal |
| **025** / **044** | Log-book People `relatedEntityId` informs candidate set (not a second entry UX in v1) |
| **043** | Journal tab / overlay hosts the list + modal open |
| **030** | Extend FormattedText (or a thin wrapper) so emphasis and person links compose |

## Out of scope (v1)

- Linking names in Scene / Social / narration feed (journal only)
- Auto-creating log-book People rows when a dossier is generated
- Editing, renaming, or merging journal entries from the dossier
- Party-member or player-character “dossiers”
- Fuzzy / nickname / alias matching beyond stored NPC `name`
- RAG / semantic entity linking (**083**)

## Sub-tickets

### 121.1 Match + candidate-set SPEC

#### Description

Document who is eligible to match, how names are matched, ambiguity rules, and how “dossier generated” is defined for the journal list (`opinionSummary` present). Place SPEC under `docs/` or `src/shared/journal/` (or adjacent to `npcDossier` if shared).

#### Acceptance criteria

- [ ] SPEC defines the candidate NPC set (at minimum: log-book-linked People and/or dossier-generated NPCs; explicit non-goals for full-cast linking)
- [ ] SPEC defines whole-word / boundary-safe matching, longest-name-first, and ambiguity → no link
- [ ] SPEC defines “dossier generated” = persisted opinion summary present, and that those NPCs appear in the journal list
- [ ] SPEC states reuse of the **105** dossier open path

### 121.2 Name matcher (pure logic + tests)

#### Description

Pure function(s): given journal text + candidate `{ npcId, name }[]`, return non-overlapping match spans (start/end + `npcId`). TDD-first.

#### Acceptance criteria

- [ ] Matcher returns spans for case-insensitive boundary-safe name hits
- [ ] Longest-name-first prevents partial overlaps (e.g. “Ann” vs “Anna”)
- [ ] Ambiguous duplicate names in the candidate set produce no link for that token
- [ ] Unit tests cover hits, misses, overlap, empty candidates, and empty text

### 121.3 Journal entry render + open dossier

#### Description

Render journal entry content with interactive person matches (compose with existing emphasis formatting). Activating a match opens the dossier for that `npcId`.

#### Acceptance criteria

- [ ] Matched names are keyboard- and pointer-activatable and open the existing dossier modal
- [ ] Emphasis markers and person links compose without raw marker leakage
- [ ] Unmatched text renders as today
- [ ] Component tests: match present → open called with correct `npcId`; no false open on plain text

### 121.4 Dossier-known NPCs appear in the journal surface

#### Description

When an NPC has a generated dossier (persisted opinion summary), list them on the journal surface (sheet section and/or Journal overlay) so the player can reopen the dossier without Social or a log-book People row.

#### Acceptance criteria

- [ ] NPCs with `opinionSummary` set appear in the journal-side known-people / dossiers list
- [ ] NPCs without a generated dossier do not appear in that list solely from existing somewhere in the campaign
- [ ] Choosing a list row opens the same dossier modal for that `npcId`
- [ ] Empty state when no dossiers have been generated yet
- [ ] Unit/IPC or component tests cover inclusion/exclusion by opinion-summary presence

### 121.5 Play-sheet wiring + smoke

#### Description

Wire candidate loading + dossier open through play-sheet / journal overlay controls; add a short smoke note to the dossier or journal runbook.

#### Acceptance criteria

- [ ] From play mode Journal, a matched name in a journal entry opens the dossier
- [ ] From play mode Journal, a dossier-known list row opens the dossier
- [ ] Closing the dossier returns focus/UX consistent with other play-sheet modals
- [ ] Smoke/runbook step documents both paths
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass when implemented
