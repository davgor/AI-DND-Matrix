# Combat flee smoke test

## Automated

```bash
npm test -- src/db/combatFleeSmoke.test.ts src/engine/fleeDisengage.test.ts src/shared/combat/flee/types.test.ts src/agents/fleeNarration.test.ts src/agents/combatIntent.test.ts
```

## Scenario

One encounter exercises all three flee outcomes:

1. Player submits flee phrasing — DM classifies `combatIntent: flee`
2. Losing disengage roll — action consumed, encounter stays active
3. Winning roll + DM `still_pursued` — encounter remains active, player may retry
4. Winning roll + DM `escaped` — player marked exited; encounter can stay active for remaining combatants
5. Player submits normal exploration text — routes outside combat while encounter remains if allies/hostiles continue

## Manual (dev)

1. Start or seed a campaign with an active combat encounter on the player's turn.
2. Type "I run for the door" — confirm exposition shows **Flee failed** or **Still pursued** / **Escaped** prefixes (not generic combat copy).
3. On a successful disengage, confirm the combat HUD shows **Fleeing — still pursued** until a full escape.
4. After a full escape, confirm the HUD notes allies may still be fighting and the player can submit non-combat actions.

## Notes

- Disengage success is engine-only — provider JSON cannot force escape without a winning opposed Agility roll.
- Full escape requires both a successful engine check and a DM judgment of `escaped`.
