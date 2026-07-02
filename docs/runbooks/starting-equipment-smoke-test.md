# Starting equipment selection smoke test

Validates epic **047**: archetype loadouts, equipment onboarding step, persistence, and handoff to guided identity.

## Prerequisites

- `npm install`
- Native module built: `npm run rebuild:node` (runs automatically via `pretest`)

## Automated smoke

```bash
npx vitest run src/db/startingLoadout.test.ts src/engine/startingLoadout/packages.test.ts src/db/migrateGuidedCreationEquipmentPhaseV26.test.ts src/shared/guidedCreation/stageRouting.test.ts src/renderer/src/equipmentSelection/EquipmentSelection.test.ts
```

Flow:

1. New player characters start in `equipment` guided-creation phase
2. Fighter loadout grants items, equips slots, writes `knownSpellKeys`, updates AC, advances to `identity`
3. Mage loadout persists two level-1 spells
4. Re-applying loadout after phase advance is rejected
5. Stage routing maps `equipment` → `equipmentSelection`
6. UI logic blocks greataxe + shield off-hand before submit

## Manual smoke (full app + UI)

1. Run `npm run dev` with a configured provider.
2. Create a campaign and complete mechanical character setup; click **Choose your gear**.
3. Select weapon, armor, and off-hand options. If you pick a two-handed weapon, confirm shield/second-weapon options disable.
4. For casters, pick the required number of spells; confirm **Tell me about yourself** stays disabled until all picks are made.
5. Confirm equipment; guided identity should start.
6. Open character sheet during identity — equipped weapon/armor and AC should reflect choices; spellbook should list starting spells.
7. Restart the app before confirming equipment — you should return to the equipment page.
8. Complete guided creation and enter play — gear and spells should persist.

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| | vitest | | |
