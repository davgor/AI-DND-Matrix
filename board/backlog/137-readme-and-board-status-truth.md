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

## Sub-tickets

### 137.1 Audit board vs README

#### Description

List done highs, backlog **121–138**, revisit **020**, moonshots m001–m005; note missing **021** file until **138** lands.

#### Acceptance criteria

- [ ] Audit notes captured in PR/commit message or short checklist on this ticket

### 137.2 Update README Status + Roadmap

#### Description

Edit README sections to match audit; fix stale **100**/**106** rows.

#### Acceptance criteria

- [ ] No false in-progress claims
- [ ] Active backlog includes critique epics **129–136** and existing **121–128** at a sensible summary level
- [ ] Revisit/moonshot tables accurate

### 137.3 Consistency pass

#### Description

Quick pass: Settings intro companion sentence vs **129** state; rules lockout sentence vs **126** state — footnote “see epic” if still pending rather than lying.

#### Acceptance criteria

- [ ] No README sentence claims a feature UI that is currently hidden without naming the gap/epic
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass (docs-only still preferred green CI)
