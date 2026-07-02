# Spellbook smoke test

Manual verification for epic **046** after automated `src/db/spellbookSmoke.test.ts` passes.

## Prerequisites

- Dev build: `npm run dev`
- Campaign with a mage (or any character who can earn `spell_access` perks)
- Claude or Player2 provider configured

## Steps

1. **Level-up grant** — Play until a level-up ceremony offers `spell_access` (arcane study path). Choose a spell perk (e.g. Firebolt).
2. **Journal tab** — Resume play. Open the play sheet **Journal** tab.
3. **Open spellbook** — Click **Open spellbook**. Spellbook modal opens centered on the viewport.
4. **Verify card** — Confirm Firebolt appears with effect type, range, turn cost, tags, and constraints hint.
5. **Refresh** — Complete another turn or level-up that grants a spell. Reopen spellbook; new entry appears without restarting the campaign.
6. **Empty character** — Switch to a character with no `knownSpellKeys`. Spellbook shows **No spells learned yet.**

## Expected

- Spellbook is read-only (no cast buttons).
- Only known spells appear — not the full catalog.
- Journal and quest log buttons still work on the same tab.

## Automated

```bash
npx vitest run src/db/spellbookSmoke.test.ts src/engine/knownSpells.test.ts src/main/spellbookIpc.test.ts
```
