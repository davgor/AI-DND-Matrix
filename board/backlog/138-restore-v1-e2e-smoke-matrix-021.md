# EPIC: Restore cloud v1 end-to-end smoke matrix (021)

README and local-provider tickets (**020.8–020.16**) still reference a **cloud-provider v1 smoke matrix (021.x)** as the definition of done for playable confidence. The **021 epic file is missing** from `board/` (revisit/backlog), while **020** remains in `board/backlog/revisit/` as the zero-cloud spine. Without 021, “pairs with 020” is aspirational and regressions lack a single checklist.

This epic **recreates 021** as the cloud-provider end-to-end smoke runbook + ticket breakdown, aligned with today’s features (hub, Social/Scene, dossiers, Ask DM, metering — not only 2025-era loop).

Builds on existing `docs/runbooks/*-smoke-test.md`, **020** parity mirrors, packaging. Does not replace unit CI.

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Automate everything? | **Runbook-first.** Prefer documented manual/scripted smoke with clear pass/fail; automate slices only where cheap. |
| Local vs cloud? | **021 = cloud (or Player2) reference path.** **020** mirrors the same guarantees on llama.cpp. |

## Smoke tiers (restore + modernize)

1. **Campaign generation** → playable start (was 021.1)
2. **Character + party creation** (021.2) — note **129** if companions re-enabled
3. **Combat encounter** engine authority (021.3)
4. **World-altering persistence** (021.4) — align with **130** when present
5. **Rest / level-up / homebrew** (021.5) — align with **131**
6. **Currency spend** (021.6) — align with **135**
7. **NPC promotion** (021.7)
8. **Death mode execution** (021.8)
9. **Restart state integrity** (021.9)
10. **Add:** Hub multi-PC switch · Social/Scene · Ask DM OOC · dossier open (modern gaps)

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | Recreate `board/backlog/revisit/021-v1-end-to-end-smoke-matrix.md` (or `board/backlog/021-…` if promoting out of revisit — prefer **revisit** until actively staffed, matching **020**). |
| 2 | Each 021.x sub-ticket points at a runbook section with exact steps + expected engine truths. |
| 3 | Update **020** smoke tickets’ “mirrors 021.x” links once ids stable. |
| 4 | README Roadmap revisit row restored with accurate path. |

## Definition of done

- 021 epic + sub-tickets exist on the board
- Master runbook (new or extended `docs/runbooks/`) covers tiers above
- README references 021 correctly (**137** may absorb README edit)
- No claim that automated CI replaces this matrix

138.1 Recreate epic index · 138.2 Sub-tickets 021.1–021.9 · 138.3 Modern gap smokes · 138.4 Link 020 mirrors · 138.5 Runbook publish

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **020** | Local parity mirrors |
| **130** / **135** / **131** / **129** | Extend smoke expectations when those ship |
| **137** | README pointer |

## Out of scope (v1)

- Replacing Vitest unit CI
- Pixel/visual regression
- Multiplayer smokes (**m002**)

## Sub-tickets

### 138.1 Recreate 021 epic file

#### Description

Author the parent epic under `board/backlog/revisit/` with DoD and tier list.

#### Acceptance criteria

- [ ] File exists; id **021** unique; links to runbook path

### 138.2 Restore core 021.1–021.9 tickets

#### Description

Write sub-ticket files mirroring historical scope, updated for current IPC/UI names.

#### Acceptance criteria

- [ ] Nine tickets with checkable criteria and runbook anchors
- [ ] 020.x “mirrors 021.x” references resolve

### 138.3 Modern gap smoke tickets

#### Description

Add 021.10+ for hub multi-PC, Social/Scene, Ask DM, dossier — minimal but blocking for “v1 confidence.”

#### Acceptance criteria

- [ ] Sub-tickets exist with steps
- [ ] Explicit pass/fail signals

### 138.4 Relink 020 parity

#### Description

Edit 020.8–020.16 headers if ticket titles/anchors changed.

#### Acceptance criteria

- [ ] No dangling “021.x” references without files

### 138.5 Publish runbook + README pointer

#### Description

Land `docs/runbooks/` master or index; point README revisit section at 021 (coordinate with **137**).

#### Acceptance criteria

- [ ] Runbook readable end-to-end
- [ ] README lists 021 beside 020
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
