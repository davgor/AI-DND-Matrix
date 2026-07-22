# NPC relationship web smoke test (epic **127**)

Validates multi-subject NPC opinions and the player-facing relationship web.

## Prerequisites

- Provider configured for opinion generation
- Campaign with at least two player characters and two known NPCs (log-book People and/or generated dossiers)

## Automated coverage (targeted)

```bash
npx vitest run src/shared/npcRelationships src/shared/npcDossier/types.test.ts src/db/repositories/npcOpinions.test.ts src/main/npcDossier.test.ts src/main/relationshipWeb.test.ts src/renderer/src/npcDossier src/renderer/src/relationshipWeb
```

Critical paths:

- Legacy `opinionSummary` migrates into player-subject `npc_opinions` row
- Subject isolation (A→B ≠ A→C)
- First generate / skip-when-fresh / regenerate-when-stale for other PC and other NPC subjects
- Known-candidate-only web nodes (no full-cast spoiler)
- Dossier Opinion subject switch + empty “no opinion yet”
- Web empty vs multi-edge fixtures

## Manual smoke (full app + UI)

1. `npm run rebuild:electron` then `npm run dev`.
2. Open an NPC dossier from Social (or Journal / People). **Opinion** defaults to **About you**.
3. Use the Opinion subject control to pick another PC and a known NPC. Confirm empty state when no opinion exists yet; after generation, reopen and confirm persistence (same wording, no fresh LLM feel).
4. From the dossier footer, open **Relationship web**. Confirm only known NPCs appear as nodes; edges appear only where opinions exist.
5. Activate a web node → that NPC’s dossier opens. Switch Opinion subject again; Disposition / Traits / Facts unchanged.
6. Restart the app, reopen the same dossiers — multi-subject opinions still present.

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| | manual / automated | pass / fail | |
