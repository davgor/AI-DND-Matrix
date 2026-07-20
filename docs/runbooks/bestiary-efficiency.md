# Bestiary LLM efficiency ceilings (epic 116)

Documents call budgets for campaign bestiary generation points. Automated coverage: `src/main/bestiaryEpicSmoke.test.ts` (116.12).

## Call budgets by path

| Path | Expected LLM calls | Notes |
|------|--------------------|-------|
| **Composition / budget** (`planEncounterComposition`, `encounterBudget`) | **0** | Pure sync engine rules — variant mix and spend; never asks a provider |
| **Prepped** (campaign create bestiary stage) | **1 roster LLM** + lore calls **only when not preset** | Roster proposes foe species; each species with `presetLore` / known pattern skips lore LLM. Floor: `MIN_PREPPED_BESTIARY_SPECIES = 3` (`src/agents/campaignGeneration/bestiaryStage.ts`) |
| **On quest** (`assignQuestFoes`) | **0** when species already exists **or** known preset-lore patterns (e.g. rift-beast, wolf, goblin, slime) | Missing unknown species → lore LLM via `generateOrGetBestiarySpecies` only for that create |
| **On demand** (empty-region `startEncounter` / `spawnOnDemandEncounterHostiles`) | Lore LLM **only when a new species is required** | Reuse matching campaign species → **0** lore calls; provisional villager fallback when no provider |

## Invariants

- Agents never emit HP, AC, attack bonus, or damage (catalog + modifier profiles own numbers).
- Composition planner is sync and provider-free — assert with `provider.calls.length === 0` and a non-Promise return.
- Happy-path quest assignment after a prepped/preset species: spy on `generateOrGetBestiarySpecies` → not called; `provider.calls.length === 0`.

## Related

- Contract / create pipeline: `docs/runbooks/campaign-create-change-checklist.md`
- Shared contract: `src/shared/bestiary/SPEC.md`
