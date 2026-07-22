# EPIC: Hard world mutations — engine-owned place and person change

The product differentiator is causal consistency: **if you burn a village, later scenes remember it’s gone.** Today durable change mostly rides optional LLM side effects (`worldFact`, log book, `current_state_summary`). `regions.updateRegionStatus` and hub “destroyed” UI exist, but the play path rarely drives structured region mutation. Epic **040** also documented **side-effect starvation** when heuristic routes skip full `dmNarration` persistence. There is still **no contradiction detector** when grounding and new narration disagree (**025** / **083** stance).

This epic makes **world-altering outcomes engine-first**: typed proposals → validate → persist structured state → ground later turns from that state (facts remain complementary, not the only truth).

Builds on **003** / regions repos, **006** narration side effects, **038** hub destroyed affordances, **040** routing, **083** RAG. Complements **125** (political memory) — does **not** replace it. Complements **020.11** / future **021** world-alter smoke.

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Prose facts vs structured mutation? | **Structured wins for places/people status.** Burning a region sets `destroyed` (or equivalent); killing an NPC sets life/defeat state already modeled — ensure play proposals reach those writers. World facts narrate *why*; they do not substitute for status. |
| Full contradiction AI? | **No.** v1 = deterministic guards: prefer structured status in context; reject/ignore narration proposals that revive destroyed places without an explicit restore proposal. No semantic NLI judge. |
| Starvation? | Routes that can alter the world must still run a persistence path for typed mutations (or explicitly mark “no world write”). |

## Target flow

```
Player action (burn / collapse / massacre / …)
  → intent/route
  → DM proposes typed mutations (e.g. regionStatusUpdates, npcLifeUpdates)
  → engine validates FKs + clamps
  → persist region/NPC structured state + optional worldFact
  → later assembleDmContext / RAG prefers status + facts
  → destroyed region cannot be treated as pristine without restore proposal
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Typed mutation fields** on narration/side-effect schema (names in SPEC): at least region destroy/damage/restore and alignment with existing NPC death/defeat writers. |
| 2 | **Engine authority.** Agents propose; repositories/`persistNarrationSideEffects` (or successor) apply only valid mutations. |
| 3 | **Grounding priority.** Context assembly includes destroyed/altered region flags and dead/absent NPCs so the model is re-grounded from SQLite, not chat memory. |
| 4 | **Starvation guard.** Heuristic or social-only routes that skip full narration must not silently drop pending typed mutations; SPEC defines which routes may emit mutations. |
| 5 | **Legacy saves.** Existing prose-only burns stay as facts; new burns also set structured status when proposed. |
| 6 | **Hub.** Destroyed/altered regions continue to surface (**038**); keep hub in sync with new writers. |
| 7 | **Token discipline (**040**).** Slim status digests — not full history dumps. |

## Definition of done

- Play can destroy/alter a region via typed proposal; status survives restart and appears in DM/NPC grounding
- Guards prevent “pristine” treatment of destroyed regions without restore
- Starvation path covered by tests (route that used to skip writes either writes mutations or cannot claim world-alter)
- Hub reflects structured destruction
- Smoke notes + delivery gate including `act`

130.1 SPEC + schema · 130.2 Persist writers · 130.3 Grounding digests + guards · 130.4 Route/starvation wiring · 130.5 Hub sync · 130.6 Tests + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **038** | Hub destroyed UI consumes structured status |
| **040** | Routing must not starve mutations |
| **083** | RAG still selects lore; status flags are first-class beside chunks |
| **125** | Faction reputation ≠ place destruction |
| **135** | Commerce/travel reliability is sibling starvation class — share patterns if useful |
| **021** / **020.11** | World-alter smoke criteria |

## Out of scope (v1)

- Full weather/season simulation
- Automatic semantic contradiction LLM
- Rewriting all historical free-text facts into structured rows
- Tick-based disaster clocks
- Map/pixel destruction (**m004**)

## Sub-tickets

### 130.1 SPEC — mutation contract

#### Description

Document typed mutation fields, restore rules, grounding priority, and which routes may emit mutations.

#### Acceptance criteria

- [x] SPEC lists region + person mutation shapes and validation
- [x] SPEC defines starvation policy for non-narration routes
- [x] Shared types exported

### 130.2 DB/persist writers

#### Description

Wire side-effect persistence to `updateRegionStatus` (and NPC life/defeat writers as needed). Tests for apply + reject invalid FKs.

#### Acceptance criteria

- [x] Destroy proposal marks region destroyed with cause; restart-safe
- [x] Invalid region ids ignored/rejected without corrupt save
- [x] Optional worldFact still creatable alongside

### 130.3 Grounding digests + guards

#### Description

Assemble slim destroyed/altered digests into DM (and NPC when regional). Guard: proposals that assume intact destroyed regions without restore are dropped or corrected per SPEC.

#### Acceptance criteria

- [x] Unit tests: destroyed region appears in context
- [x] Guard test: illegal pristine assumption handled per SPEC
- [x] Budget assertions remain within **040**-style caps

### 130.4 Intent/route starvation wiring

#### Description

Audit turn resolve paths; ensure world-alter intents hit mutation persistence. Add regression test for a former starvation route.

#### Acceptance criteria

- [x] At least one integration test proves mutation persists on the locked alter path
- [x] Document routes that are explicitly non-mutating

### 130.5 Hub sync

#### Description

Confirm hub snapshot shows destroyed/altered from structured fields after play mutations (not only manual test updates).

#### Acceptance criteria

- [x] Hub fixture/test: after mutation, preview reflects destroyed
- [x] Legacy empty status still fine

### 130.6 Verification + smoke

#### Description

Smoke: burn/alter → leave → reopen → DM grounding knows. Full delivery gate including `act`.

#### Acceptance criteria

- [x] Smoke notes written (or runbook delta)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
