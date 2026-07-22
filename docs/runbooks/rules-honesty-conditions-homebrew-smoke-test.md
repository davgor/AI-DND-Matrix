# Rules honesty — conditions + emergent homebrew (epic 131)

Smoke notes for engine-applied condition effects and the honest emergent homebrew loop. Pair with combat / progression runbooks below.

## Automated

```bash
npx vitest run \
  src/engine/conditions.test.ts \
  src/engine/playerAttack.test.ts \
  src/engine/npcAttack.test.ts \
  src/engine/saves.test.ts \
  src/engine/emergentDirection.test.ts \
  src/agents/levelUp.test.ts \
  src/db/hpCombatSnapshot.test.ts
```

Also see:

- `docs/runbooks/combat-encounter-smoke-test.md` (attacks / HUD)
- `docs/runbooks/progression-smoke-test.md` (XP → level-up → perks)
- `src/shared/rulesHonesty/SPEC.md` (call sites + dying-save exception)

## Manual deltas (131)

1. **Poisoned disadvantage** — Give a character `stats.conditions: ["poisoned"]` (or seed an NPC with poisoned). Resolve an attack or ability check; confirm the engine rolls with disadvantage (lower of 2d20). Combat HUD lists the condition for the player when set on `stats.conditions`.
2. **Stunned / unconscious Actions** — With `stunned` or `unconscious` on the sheet, Action attempts in combat are blocked (`canAct`); movement policy unchanged from existing combat gates.
3. **Emergent homebrew offer** — After enough off-kit tagged events to cross the detection threshold, open a level-up ceremony. Confirm the perk prompt / fallback includes an emergent-tagged `custom_feature` when the LLM path fails; picking `custom_feature` persists engine-clamped template numbers (flavor name/description only from the agent).
