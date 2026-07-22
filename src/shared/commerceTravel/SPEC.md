# Reliable commerce and travel intents (Epic 135)

Buying gear and traveling between regions must not depend on optional DM narration fields alone (`itemPurchases`, prose destination). Composer remains the only shop/travel channel — no graphical shop or map picker.

Shared types: `src/shared/commerceTravel/types.ts`. Classification: `src/engine/commerceTravel/`. Persist: `src/db/repositories/commerceTravelResolve.ts`. Turn hooks: `turnIpc.ts` (marked `// EPIC-135`).

Complements turn-routing starvation guards (`src/shared/turnRouting/SPEC.md`) and world-mutation philosophy (`src/shared/worldMutations/SPEC.md`): social-only routes that skip `dmNarration` must still allow a dedicated commerce/travel resolve branch.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Commerce:** classify buy/sell/trade → resolve against catalog (engine price clamp) → persist inventory + currency. One clear intent → one transaction. |
| 2 | **Travel:** classify travel → resolve destination (known region id, or generate-ungenerated when on the travel bypass per **038**) → clamp days → update `currentRegionId` + campaign clock. |
| 3 | **Narration** flavors outcomes but is never the sole writer for debit/move. |
| 4 | **Starvation:** converse/act rows that omit narration still run commerce/travel resolve when classification accepts an intent. |
| 5 | **Failure:** broke / unknown item / unknown destination → player-visible fail codes, not silent no-op. |
| 6 | **No shop UI** / flea-market sim / bargaining mini-game. |

## Intent shapes (classifier output)

### Commerce

```ts
{ op: 'buy' | 'sell' | 'trade'; itemNameHint: string; catalogItemId?: string }
```

- `trade` resolves as a **buy** of the named catalog item (one transaction).
- `catalogItemId` set only when the hint uniquely matches a catalog name (case-insensitive, longest match).
- Unmatched hint → fail `unknown_item` (no invent).

### Travel

```ts
{ destinationNameHint: string; estimatedDays: number; regionId?: string }
```

- `regionId` set when the hint matches a campaign region name.
- Days default `1`, clamped by `resolveTravel` (`MIN_TRAVEL_DAYS`–`MAX_TRAVEL_DAYS`).

## Clamp / price rules

| Op | Price | Persist |
|----|-------|---------|
| buy / trade | `priceForItem(type, rarity)` capped by `MAX_ITEM_PRICE` | debit + grant 1 |
| sell | `sellPriceForItem` = `max(1, floor(buyPrice / 2))` | remove 1 owned + credit |

Currency never goes negative (`adjustCharacterCurrency`).

## Failure codes

| Code | When |
|------|------|
| `insufficient_funds` | Buy/trade price exceeds balance |
| `unknown_item` | No catalog match for hint |
| `not_owned` | Sell of an item the PC does not have |
| `unknown_destination` | Travel hint matches no region and generation is unavailable/failed |
| `already_here` | Destination equals current region (no day advance / no move) |

## Which routes invoke resolve

| Route | Commerce / travel resolve? |
|-------|----------------------------|
| `actionType: 'travel'` bypass | Travel resolve (existing + destination match/generate) |
| Heuristic/LLM routed turns (incl. converse/act) | Commerce resolve when classifier accepts; travel overlay when classifier matches a known region and intent did not already short-circuit |
| Rest / modifyItem / combat bypass | No commerce/travel resolve from this epic |
| Ask-the-DM OOC | No |

Narration `itemPurchases` may still run; engine resolve skips a catalog id already successfully purchased this turn (no double debit).

## Player feedback

Turn result carries `commerceTravelFeedback` (success or fail copy). Play status alerts show it — success does not require reading DM prose.

## Explicit non-goals (v1)

- Graphical shop / map picker UI
- Bargaining mini-game
- Mount/vehicle logistics
- Multi-party split travel beyond companion follow rules (**129**)
- Parallel per-PC calendars (see shared time **133**)
