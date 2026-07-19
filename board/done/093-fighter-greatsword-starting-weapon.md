# 093 — Fighter starting weapon: Greatsword

Add **Greatsword** to the fighter's starting weapon choices during character equipment selection. The item already exists in the starter catalog (`seedStarterItems`); it was missing from the fighter starting-loadout package.

## Acceptance criteria

- [x] Fighter starting loadout package offers `Greatsword` alongside existing weapons (Longsword, Handaxe, Greataxe)
- [x] `src/engine/startingLoadout/SPEC.md` documents Greatsword on the fighter weapons row
- [x] Engine validation accepts a fighter loadout that picks Greatsword with empty off-hand
- [x] Engine validation rejects Greatsword + non-empty off-hand (`two_hand_blocks_off_hand`), same as Greataxe
- [x] Package catalog resolution test continues to pass (Greatsword resolves in starter items)
- [x] Scoped starting-loadout + equipmentSelection tests pass; `npm run build` passes
