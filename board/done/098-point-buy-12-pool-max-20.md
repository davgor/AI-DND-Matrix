# 098 — Point buy: 12-point pool, max score 20

Lower the character-creator point-buy budget from 15 to 12 points, and raise the per-ability maximum from 15 to 20 so a player can specialize a single score up to 20 by spending the full pool (cost is still `score - 8`).

## Acceptance criteria

- [x] `POINT_BUY_POOL` is 12 and `POINT_BUY_MAX` is 20 in `src/engine/abilities.ts`
- [x] `resolvePointBuy` / `getPointBuyRemaining` accept a valid 12-point allocation and allow a single score of 20; reject over-budget and out-of-range scores (covered by `src/engine/abilities.test.ts`)
- [x] Character setup validation error copy reflects the 8–20 range and 12-point budget
- [x] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
