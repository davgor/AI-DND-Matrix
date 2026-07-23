# 155 — Triple creature preseed catalog with conventional TTRPG foes

Expand the v1 creature catalog from 16 seed enemies to 48 so campaign bestiary defaults and encounter hydration have a broader conventional foe roster (goblinoids, humanoids, dragons, undead, fiends, beasts, elementals, constructs).

## Acceptance criteria

- [x] `CREATURE_SEEDS_V1` contains exactly 48 unique keyed entries (`src/db/catalog/seeds/creatures.ts`)
- [x] Every taxonomy bucket in `BUCKETS` still has at least one seed
- [x] New entries are conventional fantasy/TTRPG critters with valid temperament/`canSpeak`, damage types, and bucket tags
- [x] `src/db/catalog/seeds/creatures.test.ts` asserts the 48-count and still imports cleanly / re-imports without duplicates
- [x] Schema migration v56 reseeds so existing installs gain the new keys (tested)
- [x] `docs/runbooks/catalog-curation.md` changelog notes the expansion
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
