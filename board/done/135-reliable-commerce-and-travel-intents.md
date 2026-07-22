# EPIC: Reliable commerce and travel intents

Buying gear and traveling between regions today are largely **speech acts**: they work when the DM emits `itemPurchases` / travel side effects and the engine clamps them. That is the same **starvation class** as soft world facts (**130**): players say â€œI buy the swordâ€ or â€œI travel to Oakhollowâ€ and sometimes nothing durable happens. There is no shop surface (by design for v1 text adventure), but **intent â†’ engine debit/move** must be reliable when the player clearly attempts commerce or travel.

This epic adds **deterministic intent classification + engine resolution** for commerce and travel so success does not depend on optional narration fields alone â€” narration still flavors the outcome.

Builds on item purchase persist paths, travel day clamp / region change (**038** travel), intent/route (**084** / **040**), currency repos. Sibling to **130** (share starvation-guard patterns).

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Full shop UI? | **No.** Composer remains the channel. |
| LLM optional? | Intent may be LLM- or heuristic-classified, but **price clamp, inventory grant, currency debit, region move, day advance** are engine-owned once intent is accepted. |
| Failure? | Clear player-visible failure when broke / unknown item / unknown destination â€” not silent no-op. |

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Commerce path:** classify buy/sell/trade intent â†’ resolve against catalog (or DM-proposed price clamped) â†’ persist inventory + currency. |
| 2 | **Travel path:** classify travel intent â†’ resolve destination (known region id or generate-ungenerated flow per **038**) â†’ advance days by clamp â†’ update `currentRegionId`. |
| 3 | **Narration** still runs for flavor but cannot be the only writer for debit/move. |
| 4 | **Starvation:** social-only routes that skip narration must still allow a dedicated resolve branch for these intents (or re-route to it). |
| 5 | **No flea-market sim** â€” one transaction per clear intent is enough. |

## Definition of done

- Buy with sufficient funds always debits/grants when intent accepted; insufficient funds fails visibly
- Travel to known region always moves + advances time when intent accepted
- Tests for success, broke, unknown item/destination, restart persistence
- Delivery gate including `act`

135.1 SPEC Â· 135.2 Commerce resolve Â· 135.3 Travel resolve Â· 135.4 Intent/route wiring Â· 135.5 Player feedback UX Â· 135.6 Tests + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **024** / equipment | Inventory writers |
| **038** | Ungenerated destination travel |
| **040** / **084** | Intent merge / social routes |
| **130** | Shared â€œdonâ€™t starve side effectsâ€ philosophy |
| **020.13** | Local-provider currency smoke parity later |

## Out of scope (v1)

- Graphical shop / map picker UI
- Bargaining mini-game
- Mount/vehicle logistics
- Multi-party split travel for companions beyond **129** follow rules

## Sub-tickets

### 135.1 SPEC â€” commerce + travel resolve

#### Description

Document intent shapes, clamp rules, failure codes, and which routes invoke resolve.

#### Acceptance criteria

- [x] SPEC + shared result types (success/fail reasons)
- [x] Explicit non-goals (no shop UI)

### 135.2 Engine/DB commerce resolve

#### Description

Pure + repo path: given accepted purchase, clamp price, debit, grant item; sell path if SPEC includes.

#### Acceptance criteria

- [x] Unit tests: success, insufficient funds, invalid catalog id
- [x] Restart persistence test

### 135.3 Travel resolve

#### Description

Accepted travel updates region + in-game date via existing clamps; hooks ungenerated destination loading when needed.

#### Acceptance criteria

- [x] Tests: known region move + day advance
- [x] Invalid destination fails cleanly

### 135.4 Intent / turn wiring

#### Description

Wire classification â†’ resolve **before or beside** narration so writes always happen on accept; regression for prior no-op path.

#### Acceptance criteria

- [x] Integration test with stub provider: buy line â†’ inventory changed even if narration omits `itemPurchases`
- [x] Same for travel / `currentRegionId`

### 135.5 Player-visible feedback

#### Description

Surface engine success/fail in Social/Scene or toast/banner consistent with existing chrome.

#### Acceptance criteria

- [x] Component or snapshot test for fail copy (broke / unknown)
- [x] Success does not require reading DM mind

### 135.6 Verification + smoke

#### Description

Smoke: buy â†’ sheet shows item; travel â†’ hub/play region updates. Full delivery gate including `act`.

#### Acceptance criteria

- [x] Smoke notes written
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
