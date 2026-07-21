# EPIC: Multi-PC shared time — explicit causality stance

Campaign Hub (**038**) sells multiple player characters in one **live shared world**. Time is a single campaign `in_game_date` advanced by rest/travel for whoever is active. Inactive PCs are AI-proxied when encountered, but there is **no product rule** for “Alice rested three days — what is Bob’s calendar?” Epic **124** improves leave-off prose; it does not resolve temporal paradoxes.

This epic **locks and implements a v1 time model** so multi-PC play doesn’t feel accidentally broken — even if the answer is “one shared clock forever.”

Builds on **038**, day counter / rest / travel clamps, hub sessions `last_played_at`, **124** recap (complementary).

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Parallel calendars per PC? | **No in v1** unless spike proves cheap — default recommendation to lock: **one shared campaign clock**. |
| What players need? | Explicit UX copy + grounding so switching cast members doesn’t imply private timelines. Optional “while you were away” digest from events since that PC’s last active turn (derived, not a second clock). |

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **SPEC must pick one model** before UI work: (A) shared clock only + copy; (B) shared clock + per-PC “last active at world day N” watermark + away digest; (C) rejected: full per-PC calendars. Default bias: **B**. |
| 2 | Rest/travel always advance the **campaign** clock. |
| 3 | Away digest (if B): deterministic summary from event log / recap inputs since watermark — LLM optional, budgeted, not required for DoD if deterministic copy suffices. |
| 4 | Hub may show world day + per-cast “last active” without implying divergence. |
| 5 | Inactive proxy grounding includes current world day. |

## Definition of done

- Written SPEC with chosen model A or B
- Persistence for any watermarks
- Hub and/or play chrome communicates the model
- Away digest or explicit “shared time” copy shipped per SPEC
- Tests + delivery gate including `act`

133.1 SPEC decision · 133.2 Persistence · 133.3 Grounding + proxy · 133.4 Hub/play UX · 133.5 Tests + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **038** | Multi-PC hub foundation |
| **124** | Session recap ≠ time model; may share prose helpers |
| **130** | World mutations are world-scoped (same clock) |
| **m002** | Multiplayer time out of scope |

## Out of scope (v1)

- Per-PC parallel worlds / instance dungeons
- Season/weather simulation
- Automatic sim of inactive PC adventures while away (no off-screen XP grind)

## Sub-tickets

### 133.1 SPEC — choose and document time model

#### Description

Lock A vs B with player-facing rules and data fields.

#### Acceptance criteria

- [ ] SPEC names the model and non-goals (no parallel calendars)
- [ ] Shared types for watermarks / digest DTOs if B

### 133.2 Persistence

#### Description

Migration for per-PC last-active world day (or equivalent) if B; campaign clock remains source of truth for “now.”

#### Acceptance criteria

- [ ] Repo tests for watermark update on play/rest/travel
- [ ] Legacy saves default safely

### 133.3 Grounding + inactive proxy

#### Description

DM / inactive-PC proxy context includes world day and away gap when relevant.

#### Acceptance criteria

- [ ] Unit tests for context fields
- [ ] Proxy does not invent a private calendar

### 133.4 Hub / play UX

#### Description

Show world day; cast rail shows last-active; optional away blurb when selecting a PC who lagged the clock.

#### Acceptance criteria

- [ ] Component tests for shared-time copy / away blurb empty vs present
- [ ] No implication of separate timelines if model A

### 133.5 Verification + smoke

#### Description

Smoke: play Alice rest → switch Bob → UI/clock coherent. Full delivery gate including `act`.

#### Acceptance criteria

- [ ] Smoke notes written
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
