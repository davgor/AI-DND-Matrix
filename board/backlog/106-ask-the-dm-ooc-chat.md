# EPIC: Ask the DM — out-of-character player ↔ DM chat

While playing a campaign, players sometimes need to talk to the DM **as a player** — rules clarifications, “what was that NPC’s name again?”, table talk, session preferences — without acting in character or advancing the fiction.

Today every Social composer send goes through `turn:resolve` → `resolvePlayerTurn`, which always runs intent/routing, beats, events, and often a save snapshot. There is no out-of-character (OOC) channel. Recap is the closest pattern for a dedicated overlay + separate IPC that does **not** touch the turn loop, but the **entry point** for this feature lives in the play sheet Journal tab (with journal / knowledge / quest / spellbook actions).

This epic adds an **Ask the DM** button on the Journal tab action list in `PlaySheetJournalTab` (**directly under** “Open spellbook”) that opens a dedicated OOC chat. The player speaks as themselves; the DM replies as table facilitator. Messages must **never** trigger turn updates, combat advances, social/scene log projections, routing beats, or narration side effects.

Builds on **010** (play loop), **043** (session chrome + Recap overlay pattern for the panel), **029** (Scene/Social log split). Independent of **105** (identity kickoff context).

Broken down into sub-tickets **106.1–106.6**. This epic is done when all are complete and `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass.

## Definition of done

- Journal tab (`PlaySheetJournalTab`) exposes an **Ask the DM** control **directly under** “Open spellbook”
- Opening it shows an OOC chat panel usable during live campaign play (including combat)
- Player and DM messages are clearly **out of character** (player-as-player, DM-as-facilitator)
- Sending / receiving OOC messages does **not** call `turn:resolve` / `resolvePlayerTurn`, does not append Scene/Social play-log entries, and does not advance combat, rest, travel, or world side effects
- History persists per campaign (and character when applicable) across session reopen
- Tests cover UI wiring, IPC/persistence isolation, and agent OOC mode

106.1 OOC contract + spec · 106.2 Journal-tab button + chat panel UI · 106.3 IPC + persistence · 106.4 OOC DM agent · 106.5 turn-pipeline isolation guarantees · 106.6 tests + smoke

## Design direction

```
Play sheet → Journal tab actions:
  Open journal
  Open knowledge base
  Open quest log
  Open spellbook
  Ask the DM          ← new, immediately under spellbook
        └─► OOC overlay / panel
            [player] Can I cast X while grappled?
            [DM]    Yes — with disadvantage on the attack…
            composer ──────────────────────── [Send]
```

**Principles:**

1. **OOC ≠ Act** — Social “Act” stays in-character and turn-routed; Ask the DM never shares that path
2. **Journal entry point** — same action-button pattern as Open journal / Open spellbook in `PlaySheetJournalTab` (`play-sheet-journal-actions`), **not** a session-chrome control next to Recap
3. **No fiction advance** — answers may reference campaign facts the player already knows; they must not invent scene events that appear in Scene/Social or mutate world state
4. **Table talk tone** — prompts instruct the DM to answer the human player directly (rules, reminders, clarifications), not to narrate as if the character spoke
5. **Safe during combat / submitting turns** — panel stays usable; OOC send does not block or interleave with `turn:resolve`

## Open decisions (resolve during 106.1)

- **Panel chrome:** modal overlay (Recap / spellbook-like) vs docked drawer vs floating panel — pick one and document z-index vs Recap / spellbook / promotion / level-up
- **Persistence shape:** new event type (e.g. `ooc_dm_chat`) excluded from Scene/Social filters, vs dedicated table — prefer whatever keeps narration log projection clean
- **Scope of grounding:** slim campaign summary + recent IC context for answers, or rules/meta only with minimal world facts?
- **Character scoping:** one OOC thread per campaign, or per active character?

## Out of scope

- Changing Social composer / `turn:resolve` behavior for in-character actions
- In-character “whisper to DM” that still advances the scene
- Multiplayer / multi-seat OOC (single-player Electron app)
- Replacing Recap, journal notes, spellbook, or guided pre-play interview flows
- Adding Ask the DM to `PlaySessionChrome` (Recap / rolls / Hub row)
- New gameplay mechanics triggered from OOC chat

## Key touch points (for implementers)

| Area | Prefer | Avoid extending for OOC |
|------|--------|-------------------------|
| UI entry | `playSheetRailTabs.tsx` → `PlaySheetJournalTab` (button under Open spellbook) | `PlaySessionChrome` Recap/rolls/Hub actions; `PlayerActionPanel` Act / `useTurnSubmitAction` |
| Panel UX | Recap / `SpellbookModal` overlay patterns for open/close | Embedding OOC inside Scene/Social columns |
| IPC | New `askDm:*` (or equivalent) channels + preload | `turn:resolve` |
| Agent | New module (e.g. `agents/askDm.ts`) | `interpretIntentAndRoute`, `narrate` + `persistNarrationSideEffects` |
| Log filters | Explicit exclusion in `sceneContext.ts` / `narrationLog.ts` | Projecting OOC into Scene or Social |

---

## Sub-tickets

### 106.1 — OOC contract + play UX spec

#### Description

Document the Ask the DM feature in shared layout/spec (extend `PLAY_VIEW_UX_SPEC.md` or add a focused companion): OOC vs IC, **Journal-tab placement under Open spellbook**, panel behavior, what the DM may answer, hard isolation from `turn:resolve`, persistence choice, and overlay stacking relative to Recap / spellbook.

Resolve open decisions listed above so later tickets do not invent conflicting shapes.

#### Acceptance Criteria

- [ ] Spec checked in under `/shared` (or clearly linked from the epic) covering Journal-tab button placement, panel UX, OOC tone, and non-goals
- [ ] Explicit hard rule: OOC send **never** invokes `turn:resolve` / `resolvePlayerTurn`
- [ ] Persistence and Scene/Social exclusion rules are written so 106.3 can implement without re-deciding
- [ ] Overlay/panel z-index relative to Recap, spellbook, and existing play overlays is documented

---

### 106.2 — Journal-tab “Ask the DM” button + chat panel UI

#### Description

Add an **Ask the DM** control to `PlaySheetJournalTab` journal actions, **immediately after** the “Open spellbook” button in `play-sheet-journal-actions`. Opening it shows the OOC chat panel: scrollable transcript, composer, loading/error states, dismiss (button / Escape / backdrop as chosen in 106.1).

Panel is reachable whenever the play sheet Journal tab is available (exploration and combat). Sending is wired to the 106.3 IPC once available; until then, UI can stub with a typed client boundary.

#### Acceptance Criteria

- [ ] Journal tab shows an **Ask the DM** button **directly under** “Open spellbook” that opens the OOC panel
- [ ] Panel is usable during campaign play (including when combat is active)
- [ ] Composer + transcript are visually distinct from Scene/Social columns (clear OOC labeling)
- [ ] Component/UI tests cover open/close and Journal-tab wiring (same spirit as spellbook / journal action tests)
- [ ] Styles live with play sheet rail / journal actions (`playSheetRail.css` or adjacent), matching existing `play-sheet-action-button` patterns

---

### 106.3 — Ask-DM IPC + persistence (no turn side effects)

#### Description

Add typed main/preload IPC to list history and send a player OOC message (and receive the DM reply). Persist the thread using the shape chosen in 106.1. Persistence must not project into Scene or Social feeds (`filterDmExpositionEntries` / `filterSocialEntries` / `buildNarrationLog`).

Sending must not call `resolvePlayerTurn`, must not run routing beats, and must not treat the message as a `player_action` turn event.

#### Acceptance Criteria

- [ ] Preload exposes typed `askDm` (or equivalent) APIs; main registers handlers outside `turnIpc` resolve path
- [ ] Player OOC messages and DM OOC replies persist and reload for the correct campaign/character scope
- [ ] OOC records never appear in Scene or Social play-log projections
- [ ] Unit/integration tests cover list/send persistence and exclusion from narration/social filters
- [ ] Send path does not invoke `resolvePlayerTurn` / `turn:resolve`

---

### 106.4 — OOC DM agent mode

#### Description

Add a dedicated agent path (e.g. `src/agents/askDm.ts`) that answers the human player as DM-facilitator: clarifications, rules reminders, known facts — not in-character narration and not intent/routing schemas.

Use slim grounding per 106.1. Do **not** call `persistNarrationSideEffects`, combat/rest/travel resolvers, or narration beat executors. Cap tokens and define a clear prose/JSON contract for the reply.

#### Acceptance Criteria

- [ ] OOC system prompt instructs player-as-player / DM-as-facilitator tone and forbids advancing the fictional scene as a turn
- [ ] Agent module has no dependency on intent/routing narration side-effect persistence
- [ ] Unit tests cover prompt grounding rules and reply shaping (success + empty/error handling)
- [ ] Wired from 106.3 send handler so the UI receives a DM OOC reply

---

### 106.5 — Turn-pipeline isolation guarantees

#### Description

Harden and document isolation so regressions are caught: OOC send cannot enqueue combat turns, append IC Social lines, create scene DM exposition, trigger rest/travel/item-mod, or force a turn save snapshot.

Add focused tests (and optional DEV trace distinct from campaign-action turn traces) proving the OOC path stays off `executeResolvedPlayerTurn` / routing beats.

#### Acceptance Criteria

- [ ] Automated tests assert OOC send does not call `resolvePlayerTurn` and does not emit IC `player_action` / DM narration / combat advance events
- [ ] In-character Social “Act” path remains unchanged (still uses `turn:resolve`)
- [ ] No world-mutating narration side effects run on OOC replies
- [ ] Isolation expectations are noted in the 106.1 spec (or a short comment/runbook pointer near the IPC module)

---

### 106.6 — Tests, smoke, and delivery gate

#### Description

End-to-end confidence: open Ask the DM from the Journal tab (under Open spellbook) mid-play, exchange messages, confirm Scene/Social/turn state unchanged, reopen campaign and see history. Close the epic only after full delivery gates.

#### Acceptance Criteria

- [ ] Smoke steps documented (or covered by automated tests) for: Journal → Ask the DM (under spellbook) → send OOC → DM reply → no turn/Scene/Social advance → history survives reopen
- [ ] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
- [ ] `act` runs for `.github/workflows/pr-checks.yml` and `.github/workflows/deadcode.yml` succeed
- [ ] All 106.1–106.5 acceptance criteria are checked off
