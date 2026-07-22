# EPIC: On-demand live world population

Campaign create + Review can mint regions and NPCs, but **play-time population is thin**: flagged NPC generation is Review-oriented (**052** out of scope for auto-detect from narration), and worlds often feel finished on day one then static. Image tokens (**122/123**) do not fix emptiness. Players who invent a barkeeper or stumble into an unnamed hamlet need the world to **grow under engine control**.

This epic adds **on-demand minting during play** for NPCs (and lightweight places when needed) from DM proposals â€” idempotent, FK-safe, budgeted â€” so the living world can densify without returning to Review.

Builds on **052** / flagged NPC, **011** promotion patterns, **006** narration schema, **116** foe spawn (enemies already on-demand), **125** faction mint (complement). Prefer reuse of create/normalize pipelines over a second generator.

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Auto-detect every name in prose? | **No.** DM emits typed `npcProposals` / `placeProposals` (or reuse existing proposal fields); engine validates. No silent full-cast spoilers from string match alone. |
| Review still required? | Review remains for bulk/edit; play mint is the live path. |

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Play-time NPC mint** via narration side effects (schema in SPEC); persists with identity bundle fields required for Social/dossier. |
| 2 | **Idempotency.** Same key/name+region rules prevent duplicates per SPEC. |
| 3 | **Place mint (v1 light).** Optional: unnamed settlement â†’ region or sub-location row; if costly, NPC-only in v1 and SPEC says so. Bias: include minimal place mint if create pipeline already supports small regions. |
| 4 | **Known-candidate set (**121**)** only gains minted NPCs after log-book link, dossier generate, or explicit meet â€” donâ€™t auto-spoiler hub cast. |
| 5 | **Token budgets (**040**).** Mint calls metered (**112**); no cascade of 10 NPCs per turn without clamp. |
| 6 | **Legacy.** Existing campaigns gain mint without backfill. |

## Definition of done

- DM can propose a new NPC in play; row persists; Social can address them after meet rules
- Duplicate/clamp guards tested
- Optional place mint per SPEC or explicit deferral noted in SPEC with ticket follow-up
- Smoke notes + delivery gate including `act`

134.1 SPEC Â· 134.2 NPC play mint persist Â· 134.3 Prompt + schema wiring Â· 134.4 Place mint or defer Â· 134.5 Grounding + spoiler rules Â· 134.6 Tests + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **052** | Identity bundle reuse |
| **116** | Enemy spawn remains separate path |
| **121** / **128** | Known-NPC linking after meet |
| **125** | Faction membership on mint when proposed |
| **122** | Face token enqueue if toggle on â€” non-blocking |

## Out of scope (v1)

- Full open-world sim populating off-screen
- Player-facing â€œspawn NPCâ€ debug cheat UI
- Rewriting Review as the only mint path

## Sub-tickets

### 134.1 SPEC â€” play mint contract

#### Description

Document proposal shapes, clamps per turn, idempotency, spoiler/known rules, place mint yes/no.

#### Acceptance criteria

- [x] SPEC + shared types exported
- [x] Clamp and idempotency rules testable

### 134.2 NPC mint persistence

#### Description

Validate + persist play-proposed NPCs via existing repos; attach region; safe ignore unknown FKs.

#### Acceptance criteria

- [x] Repo/integration tests: mint â†’ list â†’ reopen
- [x] Duplicate policy enforced

### 134.3 DM schema + prompts

#### Description

Extend narration schema/prompts so play can emit mints when the fiction introduces someone new; purpose tags for metering.

#### Acceptance criteria

- [x] Stub-provider test parses and persists a mint
- [x] Over-mint clamp drops extras

### 134.4 Place mint or explicit defer

#### Description

Implement light place/region mint **or** document deferral with a follow-up id in SPEC (no silent README promise).

#### Acceptance criteria

- [x] Either tests for place mint **or** SPEC + epic out-of-scope explicitly defer with rationale

### 134.5 Grounding + known set

#### Description

Ensure newly minted NPCs ground when present; do not appear in journal/dossier candidate sets until meet rules say so.

#### Acceptance criteria

- [x] Tests for presence in scene vs known-candidate exclusion

### 134.6 Verification + smoke

#### Description

Smoke: invent a bartender in play â†’ reopen â†’ still there. Full delivery gate including `act`.

#### Acceptance criteria

- [x] Smoke notes written
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
