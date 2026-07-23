# Curating the preseed catalog

This is the operational workflow for expanding or correcting the
creature/spell catalog without destructive resets.

## Updating an existing entry

1. Edit its object literal in `src/db/catalog/seeds/creatures.ts` or
   `src/db/catalog/seeds/spells.ts`.
2. Bump that entry's `version` field by 1.
3. Run the test suite (`src/db/catalog/seeds/*.test.ts` and
   `src/db/catalog/curation.test.ts` cover the dataset's shape and
   re-import safety).
4. Add a line to the changelog below.

Updates are safe to re-run any number of times: `importCreatureSeeds` /
`importSpellSeeds` (`src/db/catalog/importPipeline.ts`) upsert by `key`,
so editing one entry and re-importing never duplicates rows or disturbs
unrelated entries — and `seedCreatureAndSpellCatalogV1` (called both at
migration time and available for curators to call directly) is safe to
re-run against an already-seeded database.

## Adding a new bucket or entry

1. New bucket: follow the extension rules in
   `docs/runbooks/catalog-taxonomy.md` first.
2. New entry: append a new object literal with a fresh, never-reused
   `key` to the relevant seed array, set `version: 1`.
3. Re-run the dataset coverage tests to confirm bucket coverage still
   holds.

## Reproducibility across dev and packaged builds

Both `npm run dev` and the packaged app run the same migration registry
(`src/db/schema.ts`) against their own SQLite file, and migration v12
calls `seedCreatureAndSpellCatalogV1` exactly once during the upgrade
that introduces the catalog tables — so a fresh dev database and a
fresh packaged install end up with an identical catalog, with no manual
seeding step required.

## Changelog

- **v1** (TAXONOMY_VERSION 1): initial creature dataset (16 entries
  covering all 8 v1 buckets) and spell dataset (12 entries covering all
  5 seed archetypes). Creature roster later expanded to **48** conventional
  TTRPG foes (still TAXONOMY_VERSION 1; same upsert-by-key import — new keys
  only; no version bumps on the original 16). Existing installs pick up the
  new keys via schema migration **v56** (`seedCreatureAndSpellCatalogV1`).
