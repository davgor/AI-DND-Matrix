# Guided character creation smoke test

Validates epic 026: identity interview, opening-scene negotiation, play-entry gating, and persistence.

## Prerequisites

- `npm install`
- Native module built: `npm run rebuild:node` (runs automatically via `pretest`)

## Automated smoke

```bash
node scripts/guided-creation-smoke.mjs
```

Equivalent:

```bash
npx vitest run src/db/guidedCreationSmoke.test.ts src/shared/guidedCreation/stageRouting.test.ts
```

Flow:

1. Create a player character in `identity` phase
2. Send an identity interview message; foundations lock and phase advances to `opening_scene`
3. Send an opening-scene message; scene text persists and phase becomes `complete`
4. Opening scene is written to the narration log for play handoff
5. Stage routing confirms play is blocked until phase is `complete`

## Manual smoke (full app + UI)

1. Run `npm run dev` with a configured provider.
2. Create a campaign, complete mechanical character setup, click **Choose your gear**.
3. Pick weapon, armor, off-hand (if shown), and spells; confirm with **Find your traveling companion**.
4. On the traveling companion step, skip or accept a companion; then chat through identity until all four foundations complete; click **Help me set the stage**.
5. Negotiate the opening scene until **Enter the world** appears.
6. Confirm play view loads with the opening scene in DM exposition.
7. Open the character sheet — equipped gear, known spells (spellbook), Who / Why / Where / What and opening scene should display.
8. Restart mid-equipment or mid-identity; confirm the flow resumes on the correct step.

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| 2026-06-28 | vitest | pass | `node scripts/guided-creation-smoke.mjs` |
