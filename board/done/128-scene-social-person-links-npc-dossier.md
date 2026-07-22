# EPIC: Scene / Social person links → NPC dossier

Epic **121** closes the knowledge loop for the **journal**: known NPC names become activatable links that open `NpcDossierModal` (**105**). Scene exposition and the Social stream still render names as plain text (aside from Social avatar/name entry points that already open the dossier for the *speaker*).

This epic extends the **same matcher + candidate set + open path** into **Scene and Social prose** so immersion stays high without teaching a second linking system.

Builds on **121** (matcher SPEC, candidate set, FormattedText composition), **105** (dossier modal), **085** / **091** (Social + Scene streams), **030** (emphasis formatting). Prefer **reuse 121 modules** — do not fork a second name matcher.

## Target UX

```
Scene feed (DM exposition)
  └── Prose may contain known NPC name matches
        │  activate
        ▼
      NpcDossierModal (105)

Social feed
  ├── Existing: avatar / speaker name → dossier (105) — unchanged
  └── Message / reaction prose may also contain name matches for *other* known NPCs
        │  activate
        ▼
      NpcDossierModal (105)
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Reuse 121 candidate set + matcher.** Same “known NPC” rules (log-book-linked and/or dossier-known; no full-cast spoilers). Longest-name-first; ambiguity → no link. |
| 2 | **Same dossier open path.** No Scene-only or Social-only dossier UI. |
| 3 | **Compose with emphasis (**030**).** Person links and `*emphasis*` / `**strong**` must coexist in one render path (extend FormattedText / shared wrapper from **121**). |
| 4 | **Social speaker chrome stays primary for the speaker.** Linking the speaker’s name inside their own bubble is optional; do not break avatar click. Prefer linking **other** NPC names inside Social prose when both appear. |
| 5 | **Read-only linking.** No rewriting stored narration to insert markup; match at render time. |
| 6 | **Depends on 121.** Implement after (or with) **121** matcher extraction so journal/Scene/Social share one library. If **121** is incomplete, land shared matcher first under 121.2 then consume here. |

## Definition of done

- Known NPC names in Scene prose activate → dossier
- Known NPC names in Social message/reaction prose activate → dossier (without regressing avatar entry)
- Unmatched / ambiguous / unknown names stay plain text; no spoiler links
- Shared matcher used (no divergent Scene-only heuristics)
- Component tests for Scene + Social; smoke notes
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

128.1 SPEC delta (surfaces + Social speaker rules) · 128.2 Shared link renderer in Scene · 128.3 Shared link renderer in Social · 128.4 Tests + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **121** | **Hard dependency** — matcher, candidate set, FormattedText person-link primitive |
| **105** | Dossier modal open path |
| **085** / **091** | Social / Scene stream rendering |
| **030** | Emphasis + links composition |
| **127** | Optional: linked dossier may later show relationship web; not required for DoD |

## Out of scope (v1)

- Linking region / faction / item / deity names (NPC persons only)
- Fuzzy nicknames / aliases beyond stored `name` (same as **121**)
- Auto-creating log-book People rows from a Scene mention
- RAG / semantic entity linking (**083**)
- Player-character name links to a PC sheet (NPC dossiers only)

## Sub-tickets

### 128.1 SPEC delta — Scene / Social surfaces

#### Description

Document which Scene/Social text nodes are linkable, Social speaker vs other-name rules, and that candidate set === **121**. Update **121** out-of-scope note to point here when this epic is accepted.

#### Acceptance criteria

- [x] SPEC lists eligible DOM/text surfaces (Scene body, Social dialogue/action lines, exclusions)
- [x] Speaker-chrome vs in-prose link rules locked
- [x] Explicit reuse of 121 matcher module path

### 128.2 Scene person links

#### Description

Render Scene exposition through the shared person-link + emphasis path; activate → open dossier with existing play-view wiring.

#### Acceptance criteria

- [x] Component/integration test: known name in Scene → click opens dossier with that `npcId`
- [x] Unknown name not linked; ambiguous duplicate not linked
- [x] Emphasis still renders inside Scene lines

### 128.3 Social person links

#### Description

Apply the same linker to Social prose bodies/reactions. Preserve avatar/speaker dossier entry. Avoid double-buttons / nested interactive chaos (SPEC a11y: links are buttons or anchors with clear names).

#### Acceptance criteria

- [x] Other known NPC names inside a message link correctly
- [x] Avatar/speaker entry still opens the speaker’s dossier
- [x] Component tests cover dialogue + non-dialogue reaction kinds in scope

### 128.4 Verification + smoke

#### Description

Smoke: journal (**121**) + Scene + Social all open the same modal for the same NPC; no spoiler link for unencountered cast. Full delivery gate including `act`.

#### Acceptance criteria

- [x] Smoke notes cover Scene + Social → dossier
- [x] Regression: **121** journal tests remain green
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
