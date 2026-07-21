# Journal person matches — contract

Journal entry prose (epic **027**) may contain NPC display names as free text. This contract defines which NPCs are eligible to match, how names are matched into non-overlapping spans, how dossier-generated NPCs appear on the journal surface, and how matches open the existing NPC dossier modal (epic **105**).

Builds on journal feed (**027**), log book People (**025** / **044**), NPC dossier (**105**), FormattedText emphasis (**030**), and play-sheet Journal overlay (**043**). Epic **128** reuses this matcher for Scene / Social after journal lands.

Shared types and pure match helpers live under `src/shared/journal/`.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Candidate set is intentional, not full-cast.** Only NPCs the active character can reasonably rediscover: log-book–linked People and/or dossier-generated NPCs. Do **not** link every campaign NPC name (avoids spoiling unencountered cast). |
| 2 | **Matching is name-based in journal prose.** Case-insensitive, boundary-safe whole-word match on stored NPC `name`. Longest-name-first when one name is a prefix of another. Ambiguous duplicate names: prefer a uniquely resolvable candidate; if still tied, **do not link**. |
| 3 | **Same dossier modal as 105.** Journal matches and the dossier-known list both open via the existing play-sheet path (`openDossier(npcId)` → `NpcDossierModal`). No journal-only dossier UI. |
| 4 | **Dossier generated ⇒ journal list.** Any NPC with a persisted generated opinion summary appears in a journal-side known-dossiers list, even without a log-book People row. |
| 5 | **Unlinked People stay out of v1 unless cheap.** Log book People without `relatedEntityId` are not resolved by title→name in this epic. |
| 6 | **Read-only linking.** No editing journal text to insert markup; matching is computed at render/query time from the current candidate set. |

## Candidate NPC set

For the active campaign character, a candidate is an NPC with `{ npcId, name }` when **either**:

| Source | Inclusion rule |
|--------|----------------|
| **Log-book linked** | At least one log book entry for this character with `category === 'person'` and `relatedEntityId` equal to that NPC’s id |
| **Dossier generated** | The NPC row has a non-null `opinionSummary` (see below) |

Union the two sets by `npcId`. Party members / player characters are **not** candidates. Dead or relocated NPCs remain candidates if they still satisfy a row above (dossier reopen / journal mention of past contacts is intentional).

### Non-goals (candidate set)

- Matching against the full campaign NPC roster
- Fuzzy, nickname, or alias matching beyond the stored NPC `name`
- Auto-creating log book People rows when a dossier is generated
- Title-only resolution of unlinked People entries

## Name matching

Pure function contract (implementation in `matchPersonNames` / equivalent):

**Input:** journal `text: string`, `candidates: { npcId: string; name: string }[]`

**Output:** non-overlapping spans `{ start: number; end: number; npcId: string }[]` in ascending `start` order. `start` inclusive, `end` exclusive, indices into the raw journal string (same coordinates as emphasis tokenization sees before markup is stripped for display — match against the **raw** entry `content`, then compose with emphasis at render time).

### Rules

1. **Case-insensitive.** Compare using Unicode-aware case folding equivalent to `localeCompare` / lowercasing the full string and names consistently (ASCII-first is fine for v1; do not break on multi-word names).
2. **Boundary-safe (whole word).** A hit must not be a substring of a larger word. Treat letters, digits, and `_` as word characters; punctuation, whitespace, and string edges are valid boundaries. Example: `Ann` matches in `Ann smiled` and `(Ann)` but not in `Anna` or `McAnn`.
3. **Longest-name-first.** Sort distinct candidate names by descending length (then stable by `npcId`) before scanning so `Anna` wins over `Ann` when both are candidates and the text contains `Anna`.
4. **Non-overlapping.** Once a span is claimed, later shorter matches cannot overlap it.
5. **Ambiguity → no link.** If two or more candidates share the same name (case-insensitive) and that token would otherwise match, emit **no** span for that token. Prefer not opening the wrong NPC over linking.
6. **Empty inputs.** Empty text or empty candidates → empty span list.
7. **Misses stay plain.** Names outside the candidate set, or ambiguous/tied names, remain ordinary text with no affordance.

## Dossier generated (journal list)

| Term | Definition |
|------|------------|
| **Dossier generated** | NPC has persisted `opinionSummary` that is non-null (and typically non-empty after generation). `opinionSummaryGeneratedAt` may be present; **list inclusion keys off `opinionSummary` presence**, matching epic **105** persistence. |
| **Journal known-dossiers list** | Journal surface section (sheet and/or Journal overlay) listing those NPCs by display name so the player can reopen the dossier without Social or a linked People row. |
| **Exclusion** | NPCs that exist in the campaign but have `opinionSummary === null` do **not** appear in this list solely for that reason. Log-book-linked NPCs without a generated dossier may still match in prose (candidate set union) but do not appear in the dossier-known list until an opinion summary exists. |

Empty state: when no NPC in the campaign has a generated opinion summary for the list query, show an empty message (no fabricated rows).

## Dossier open path (reuse 105)

```
Journal entry — activate matched person span (npcId)
Journal known-dossiers list — choose row (npcId)
        │
        ▼
play-sheet modals.openDossier(npcId)
        │
        ▼
PlaySheetNpcDossierModal → NpcDossierModal (epic 105)
```

Same modal, IPC (`npcDossier:get`), and close/focus behavior as Social and log book People entry points. Journal must not introduce a second dossier UI.

## Render composition

Journal entry prose continues to use FormattedText emphasis (**030**). Person match spans compose with emphasis tokens: markers must not leak as raw `*` / `_` in the UI; unmatched text renders as today. Prefer extending FormattedText with optional person spans or a thin wrapper — do not fork a second emphasis parser.

## Out of scope (v1)

- Linking names in Scene / Social / narration feed — epic **128**
- Editing, renaming, or merging journal entries from the dossier
- Party-member or player-character dossiers
- RAG / semantic entity linking — epic **083**
- NPC opinions of other characters — epic **127**
