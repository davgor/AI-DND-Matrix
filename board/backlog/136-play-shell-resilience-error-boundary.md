# EPIC: Play shell resilience — ErrorBoundary and turn-failure recovery

Long LLM turns and dense React play UI mean a renderer exception can blank the campaign page (**119** fixed a specific enter-world crash class, but there is still **no product ErrorBoundary** strategy). Mid-turn provider failures can leave players unsure whether the action persisted. Auto-save after resolved actions exists; **undo** and **explicit retry without double-write** are unclear as player-facing affordances. No network crash reporter by design (**001**) — local recovery must be enough for friends/playtesters.

This epic makes the play shell **fail closed and recover visibly**: catch renderer crashes, preserve navigation back to hub/sidebar, and define turn-failure UX that avoids duplicate resolves.

Builds on **119**, turn IPC, guided-creation error categories, auto-save snapshots (Standard death mode). Not a telemetry product.

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Crash reporting to a server? | **No.** Local message + recovery actions only. |
| Full undo stack? | **No in v1.** Focus: ErrorBoundary + failed-turn retry/safe abort. |

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **React ErrorBoundary** around play view (and ideally campaign shell) with fallback UI: error summary, Return to Hub / Campaigns, optional Reload play. |
| 2 | **Turn failure UX.** When `turn:resolve` (or equivalent) fails after partial work, SPEC defines: show error; allow Retry only if idempotent/safe; otherwise Abort and keep last good save. |
| 3 | **No double-apply.** Retry must not duplicate currency debit, XP, or mutations — use existing transaction boundaries or a turn attempt id. |
| 4 | **Guided creation** may reuse categories; play path gets parity. |
| 5 | **Dev action trace (**089**)** remains; production copy stays non-technical. |

## Definition of done

- Forced render throw in play shows boundary fallback, not blank window forever
- Documented + tested turn-failure retry/abort behavior without double-write
- Smoke notes for crash fallback + failed provider turn
- Delivery gate including `act`

136.1 SPEC · 136.2 ErrorBoundary UI · 136.3 Turn failure IPC contract · 136.4 Idempotent retry · 136.5 Tests + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **119** | Prior blank-page fix; this adds systemic boundary |
| **130** / **135** | Mutations/commerce must stay transactional with retry policy |
| **021** | Smoke matrix should include failure path later |
| **m005** | Remote clients need host resilience — single-player first |

## Out of scope (v1)

- Sentry/remote crash upload
- Time-travel undo across many turns
- Replacing Standard-mode snapshot combat revert

## Sub-tickets

### 136.1 SPEC — failure and recovery

#### Description

Document boundary placement, fallback actions, turn attempt identity, retry vs abort rules.

#### Acceptance criteria

- [ ] SPEC locks no-double-write rule
- [ ] Shared error result types if new

### 136.2 Play / campaign ErrorBoundary

#### Description

Implement boundary + fallback component; wire in play shell (and parent if needed).

#### Acceptance criteria

- [ ] Component test: child throw → fallback visible; hub action callable (mocked)
- [ ] Normal play unaffected

### 136.3 Turn failure surfacing

#### Description

Map provider/main errors to player-visible play chrome states with Retry/Abort per SPEC.

#### Acceptance criteria

- [ ] Integration/unit tests for error mapping
- [ ] Success path clears error state

### 136.4 Idempotent retry

#### Description

Ensure retry of a failed turn cannot double-apply engine effects; add regression test with stub that fails once then succeeds.

#### Acceptance criteria

- [ ] Test: currency/HP/mutation applied once across fail→retry→success
- [ ] Abort leaves prior good state

### 136.5 Verification + smoke

#### Description

Smoke notes for boundary + failed turn; full delivery gate including `act`.

#### Acceptance criteria

- [ ] Smoke notes written
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
