# NPC dossier modal smoke test

Validates epic **105**: Social / log-book entry points open an NPC-scoped dossier (Traits → Facts → Opinion → Disposition), with persisted opinion that regenerates only after new player↔NPC interaction.

## Prerequisites

- `npm install`
- Provider configured (Claude or Player2) for opinion generation on first open / after interaction
- A campaign with at least one speaking NPC and one linked People log entry (`relatedEntityId` = that NPC's id)

## Automated coverage (targeted)

```bash
npx vitest run src/shared/npcDossier src/main/npcDossier.test.ts src/main/npcInteractionWatermark.test.ts src/agents/npcOpinion.test.ts src/agents/npcOpinionContext.test.ts src/renderer/src/npcDossier src/renderer/src/playView/socialStreamParts.test.ts src/renderer/src/characterSheet/LogBookEntryCard.test.tsx src/db/schema.test.ts
```

Critical paths covered:

- Opinion watermark skip / regenerate (`needsOpinionRegeneration`, `getNpcDossier`)
- Facts isolation by `relatedEntityId`
- Speaking memory isolation vs non-speaking action grounding
- Social avatar/name and log book People affordance entry points

## Manual smoke (full app + UI)

1. Run `npm run rebuild:electron` then `npm run dev` with a configured provider.
2. Enter play with a campaign that has conversed with an NPC (or converse once now).
3. **Social entry:** In the Social stream, click the NPC avatar (or name). Dossier modal opens with header name + role; sections in order Traits → Facts → Opinion → Disposition.
4. Note the **Opinion** paragraph. Close the modal. Reopen the same NPC **without** further interaction — opinion text must be **identical** (no new LLM feel / same wording).
5. Converse with (or act against) that NPC again, then reopen the dossier — opinion should **update** (or at least regenerate; wording may change).
6. **Log book entry:** Open Knowledge Base → People. On an entry linked to an NPC, click **Open dossier**. Same modal and sections appear for that NPC.
7. Confirm a player Social line and a non-person log entry do **not** open an NPC dossier.
8. Non-speaking creature (if available): open dossier — same shell; opinion grounds on actions (may be empty-ish early); disposition still shows.

## Journal entry points (epic **121**)

From play mode, open the **Journal** overlay (play sheet → Journal → Open journal). Candidate NPCs are log-book–linked People and/or NPCs with a generated dossier (see `src/shared/journal/SPEC.md`).

1. **Matched name in prose:** With a journal entry that mentions a candidate NPC by name, click/activate the linked name. The same `NpcDossierModal` opens via `modals.openDossier(npcId)` (sibling of the journal overlay in `PlaySheetModals`).
2. **Known-dossiers list:** In the Journal overlay’s **Known dossiers** section, click a row. Same dossier modal for that `npcId`.
3. **Close dossier:** Close the dossier with the modal’s close control (or overlay dismiss). Focus/UX matches other play-sheet modals (log book People → dossier); the Journal overlay remains open and usable underneath — no journal-only dossier UI.

Cross-link: [Character journal smoke test](./journal-smoke-test.md) (DB/persist loop).

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| | manual / automated | pass / fail | |
