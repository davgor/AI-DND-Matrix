# EPIC: README and board status truth

README **Status / Roadmap** still claim shipped-through ~108, **100** in progress, **106** in Ask-the-DM backlog, and understate work through ~120+ plus active backlog **121–138**. That misleads humans and agents prioritizing work. Epic **109** refreshed completed epics once; drift returned.

This epic **re-aligns README with `board/`** (done, backlog, revisit, moonshots) without inventing new product scope.

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | Status section lists real in-progress (or none), active backlog highlights, revisit (**020**), and moonshots. |
| 2 | Completed tables catch up through current highest done epic themes (group, don’t enumerate every polish ticket). |
| 3 | Cross-links: **126**/**131** rules honesty, **129** companions, **020** local provider. |
| 4 | No marketing fluff — match delivery-standards honesty. |

## Definition of done

- README Status + Roadmap match board folders
- No ticket claimed in-progress unless a file exists under `board/in-progress/`
- Delivery gate: markdown-only change still run lint/test/build/deadcode/`act` only if repo requires — for docs-only, run whatever the project usually runs for markdown; at minimum ensure no code broke. Prefer full gate if hooks expect it.

137.1 Audit board · 137.2 Rewrite Status/Roadmap · 137.3 Spot-check Settings intro vs **129** (note only if companions still hidden)

## Audit notes (137.1) — 2026-07-21

Board folders audited against README before rewrite:

| Area | Finding |
|------|---------|
| **done highs** | Through **136** (shared time, live population, commerce/travel, play resilience). Also done: **100**, **106**, **109–120**, **121–135**, polish **142-oxlint**. Ids **122**/**123** reused (epic + small UI polish). |
| **in-progress** | **137** during this work (now `done/`). Parallel: **141** place mint also under `in-progress/` at close. **Not** **100** (that ticket is in `done/`). |
| **active backlog** | Top-level at close: **139** companion face tokens, **142** world-grid (**141** moved to in-progress). Critique range **121–136** is **done**, not backlog (epic text was stale). |
| **revisit** | **020** + 020.1–020.20 under `board/backlog/revisit/`. |
| **moonshots** | **m001–m005** present under `board/backlog/moonshots/` (plus README promotion rules). |
| **missing** | No `021*` file. No **138** restore-021 file. No **140** file (deleted automated-e2e ticket). |
| **id collision** | Backlog **142** world-grid ≠ done **142** oxlint splits — named honestly in README. |

## Sub-tickets

### 137.1 Audit board vs README

#### Description

List done highs, backlog **121–138**, revisit **020**, moonshots m001–m005; note missing **021** file until **138** lands.

#### Acceptance criteria

- [x] Audit notes captured in PR/commit message or short checklist on this ticket

### 137.2 Update README Status + Roadmap

#### Description

Edit README sections to match audit; fix stale **100**/**106** rows.

#### Acceptance criteria

- [x] No false in-progress claims
- [x] Active backlog includes critique epics **129–136** and existing **121–128** at a sensible summary level *(audit: those are now **Completed**; README Completed (109–136) covers them; open work is **141** in-progress + backlog **139**/**142**)*
- [x] Revisit/moonshot tables accurate

### 137.3 Consistency pass

#### Description

Quick pass: Settings intro companion sentence vs **129** state; rules lockout sentence vs **126** state — footnote “see epic” if still pending rather than lying.

#### Acceptance criteria

- [x] No README sentence claims a feature UI that is currently hidden without naming the gap/epic *(companions onboarding **129** shipped; Character Setup party block stays hidden per **100**, named in intro; companion face tokens → **139**; lockout claim matches shipped **126**; Settings has no companion pitch to reconcile)*
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass (docs-only still preferred green CI)
