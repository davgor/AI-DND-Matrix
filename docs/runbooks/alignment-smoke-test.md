# Alignment, temperament, and non-speaking creature smoke test

## Automated

```bash
npm test -- src/db/alignmentSmoke.test.ts src/shared/alignment/types.test.ts
```

## Manual (dev)

1. Create a campaign and complete character setup — confirm the **Alignment** dropdown is required and persists on the character sheet (read-only).
2. Enter play and take an action the DM should flag as morally consequential — confirm an orange **Alignment at risk** banner appears in the DM exposition pane with warning copy.
3. Submit another action continuing the choice — confirm alignment updates on the character sheet after the DM commits the shift.
4. Encounter a non-speaking creature (e.g. beast NPC with **Non-speaking** in campaign review) — confirm its reactions render **bold** in the exposition feed, not italic dialogue.

## Notes

- Only the DM agent can change player alignment (`alignmentShiftWarning` → `commitAlignmentShift`). There is no player-facing edit control after setup.
- Speaking NPCs use italic dialogue; non-speaking entities use bold action descriptions.
