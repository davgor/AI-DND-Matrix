# 147 — Add NPC falsely rejects valid seeds as “invalid NPC”

Campaign review “Add NPC” surfaces `The narrative engine returned an invalid NPC` whenever flagged-NPC generation throws `CampaignGenerationSchemaError`. Playtesters report this for ordinary plain-English seeds (short and long herbalist / gardener prompts), so they cannot create NPCs at all.

Likely cause: phase-1 core-bundle parsing is stricter than real model output. LLMs commonly return `male`/`female` instead of roster keys `man`/`woman`, race labels / mixed case instead of exact `availableRaces` keys, and class synonyms (`herbalist`, `wizard`, `healer`) that are not in `NPC_CLASS_KEYS`. Campaign-create NPC normalization already softens race keys; add-NPC parse (`flaggedNpcParse`) does not.

Admin elevation to generate a campaign is tracked only as a note here (environment-specific); this ticket does not change Windows privilege handling.

## Acceptance criteria

- [x] `parseGenderKey` accepts common LLM aliases (`male`→`man`, `female`→`woman`) with unit tests
- [x] Flagged NPC core-bundle race resolution matches available options case-insensitively by key or label (unit tests)
- [x] `parseNpcClassKey` accepts roster labels and common class/role synonyms (e.g. `wizard`→`mage`, `herbalist`→`commoner`) with unit tests
- [x] `generateNpcCoreBundle` / `parseNpcCoreBundleRecord` accepts a realistic herbalist-style payload that previously would have failed all retries
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [ ] `act` runs for `.github/workflows/pr-checks.yml` and `.github/workflows/deadcode.yml` succeed
