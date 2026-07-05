# Race selection smoke test

Validates epic **049**: campaign-scoped race catalog, onboarding race step, lore locking, custom races, party-member/NPC reuse, and character sheet display.

## Prerequisites

- `npm install`
- Native module built: `npm run rebuild:node` (runs automatically via `pretest`)
- Configured LLM provider in `.env` for manual UI steps

## Automated smoke

```bash
npx vitest run src/engine/raceSelection/roster.test.ts src/shared/raceSelection/resolveLabel.test.ts src/agents/raceLore.test.ts src/db/repositories/campaignRaces.test.ts src/db/migrateRaceSelectionCharactersV29.test.ts src/main/raceIpc.test.ts src/db/raceSelectionIntegration.test.ts src/shared/guidedCreation/stageRouting.test.ts src/renderer/src/raceSelection/RaceSelection.test.ts src/renderer/src/raceSelection/RaceSelectionForm.test.tsx src/renderer/src/characterSheet/CharacterSheetRaceLine.test.tsx
```

Flow covered:

1. New player characters default to `race` guided-creation phase
2. First elf pick realizes and locks lore; second elf pick reuses locked lore (no second LLM call on preview)
3. Custom race mint adds a campaign catalog entry selectable by NPC generation
4. AI party member race realization is reused when the protagonist later picks the same preset
5. Stage routing maps `race` → `raceSelection`
6. Character sheet renders race label; missing race omits the line gracefully

## Manual smoke (full app + UI)

1. Run `npm run dev` with a configured provider.
2. Create a campaign and complete mechanical character setup. Add an AI party member with a predefined race (e.g. Dwarf). Click **Choose your race**.
3. Pick a not-yet-realized preset (e.g. Human). Confirm editable lore appears; edit a field and **Regenerate** once; confirm **Choose your gear**.
4. On equipment, go **Back** — you should return to race selection, not character setup.
5. From race selection, go **Back** to character setup — entered stats/party should remain.
6. Pick **Elf** if a companion already established Dwarf only; pick Elf fresh or reuse if already established (read-only lore, no Regenerate).
7. Try **Custom race**: enter or random-fill a seed, **Generate**, edit lore, confirm.
8. Complete equipment → guided identity → opening scene → play.
9. Open character sheet — race name appears near class/level.
10. Restart the app while still in `race` phase (before confirming race) — you should resume on the race page.

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| | vitest | | |
| | manual | | |
