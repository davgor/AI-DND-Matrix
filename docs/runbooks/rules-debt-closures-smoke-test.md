# Rules debt closures smoke (epic 126)

Cross-cutting manual notes for turn lockout, spell-grant feedback, custom backgrounds, and bestiary Review. Pair with existing runbooks below.

## Automated

```bash
npx vitest run \
  src/engine/turnLockout.test.ts \
  src/db/turnLockoutPersistence.test.ts \
  src/main/turnLockoutPlay.test.ts \
  src/agents/dmSpellbook.test.ts \
  src/main/spellbookIpc.test.ts \
  src/db/progressionSmoke.test.ts \
  src/shared/characterBackground/resolveLabel.test.ts \
  src/main/backgroundIpc.apply.test.ts \
  src/db/migrateBackgroundCustomLabelV49.test.ts \
  src/renderer/src/backgroundSelection/backgroundSelection.test.tsx \
  src/renderer/src/campaignReview/CampaignReviewBestiarySection.test.tsx \
  src/renderer/src/playView/PlayStatusAlerts.test.tsx
```

Also see:

- `docs/runbooks/spellbook-smoke-test.md` (grants + spellbook refresh)
- `docs/runbooks/character-background-smoke-test.md` (roster path; Custom is additive)
- `docs/runbooks/bestiary-efficiency.md` (create-time prep; Review is read-only)

## Manual deltas (126)

1. **Turn lockout** — Give a character `firebolt` (loadout or grant). In play, cast it (`usedCatalogSpellKey` via intent). Confirm a **Recovering** status banner on the next Action attempt and that Actions work again after the lockout clears. Restart mid-lockout: remaining turns persist on character stats.
2. **Spell grants** — When narration grants a catalog spell, confirm **Spell learned** banner and that Journal → Open spellbook lists the new spell after the turn (`refreshToken` bump).
3. **Custom background** — Onboarding background step: choose **Custom**, enter a required label + story, proceed. Identity context / sheet display uses the custom label. Roster picks still clear the custom label column.
4. **Bestiary Review** — Open Campaign Review on a campaign with prepped species: **Bestiary** section lists name, lore, variants. Legacy/empty campaigns hide the section.
