# 066 — Identity Where asks which generated region they start in

During guided character creation, the DM’s **Where** foundation currently interviews free-form origin/homeland and does not steer the player to pick among the campaign’s generated regions. That leaves play falling back to the first region when `currentRegionId` was never set.

## Acceptance criteria

- [x] Identity interview agent context includes the campaign’s generated regions (id, name, description)
- [x] Identity prompts instruct the DM, when covering Where, to ask which of those generated regions the character starts in (homeland/origin may still be discussed; start location must resolve to a listed region)
- [x] Completing Where persists `stats.currentRegionId` to the chosen region id
- [x] Unit tests cover region injection into prompts and `currentRegionId` persistence; `npm test`, `npm run lint`, and `npm run build` pass
