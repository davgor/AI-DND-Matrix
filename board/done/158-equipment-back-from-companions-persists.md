# 158 — Equipment selection persists when backing from traveling companion

Going back from the traveling companion step to inventory/equipment resets the player's weapon, armor, off-hand, and spell picks even though those choices were already applied. Match race/background onboarding back persistence: restore from the character record (and drafts), and allow re-confirm without duplicating gear.

## Acceptance criteria

- [x] Back from companion prompt to equipment restores prior weapon/armor/off-hand/spell selections in the UI
- [x] Re-confirming equipment after back replaces prior starting gear (no duplicate items)
- [x] Unit tests cover initial-state resolution (saved > draft > empty) and replace-on-reapply
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
