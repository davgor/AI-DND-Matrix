# 115 — Combat start without hostiles silently no-ops

Playtesting (Shield Hero / rift-beasts): player input like `*I swing my sword at the nearest beast*` routes `combatIntent: startEncounter` → combat branch, then completes in ~10ms with `narrationChars: 0` and `hasCombatState: false`. UI shows no combat HUD and no DM response.

Root cause: narrated threats often have no persisted hostile NPC rows. `startEncounter` then builds a player-only encounter; `allHostilesDefeated` treats an empty NPC list as victory (`[].every(...) === true`), finalizes as `defeated`, and returns null combat state.

## Acceptance criteria

- [x] `allHostilesDefeated` is false when the encounter has zero NPC participants (unit test)
- [x] Empty `participantNpcIds: []` falls back to region hostiles the same as omitted ids (unit test)
- [x] `startEncounter` / `resolvePlayerTurn` with `startEncounter` and no hostiles in the region still yields an active `combatState` with at least one hostile NPC (spawn provisional foe; integration/smoke test)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode pass
