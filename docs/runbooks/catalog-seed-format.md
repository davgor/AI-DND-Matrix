# Preseed catalog seed format and import pipeline

Seed content ships as plain TypeScript object literals typed against
`CreateCatalogCreatureInput` / `CreateCatalogSpellInput`
(`src/db/catalog/types.ts`) — there is no separate JSON schema to keep in
sync; the TS type *is* the machine-validated format, checked by `tsc` and
further validated at import time.

## Required fields

**Creature seed** (`CreateCatalogCreatureInput`): `key` (stable, unique,
kebab-case canonical id — never reused for a different creature),
`name`, `levelMin`/`levelMax`, `hp` (> 0), `ac` (> 0), `abilities`,
`resistances`, `damageTypes`, `tags`, `buckets` (1-3 valid buckets per
`src/shared/catalogTaxonomy.ts`), `source`, `version`.

**Spell seed** (`CreateCatalogSpellInput`): `key`, `name`, `effectType`,
`range`, `cost` (>= 0, turns per the engine's turn-cost ability system),
`tags`, `buckets`, `constraints`, `source`, `version`.

## Import pipeline

`importCreatureSeeds(db, seeds)` / `importSpellSeeds(db, seeds)`
(`src/db/catalog/importPipeline.ts`):

- Validate every seed (bucket membership, required fields, numeric
  ranges) before writing anything for that seed.
- Upsert by `key` — re-running an import with the same `key` updates the
  existing canonical row in place rather than creating a duplicate, so
  partial/incremental seed updates are safe to re-run.
- Return `{ imported: string[], errors: SeedImportError[] }` so a caller
  can report which entries failed and why (`index`, `key`, `reason`)
  without the whole batch failing.

## Adding a new seed file

Add an exported array of seed objects (see `src/db/catalog/seeds/`),
import it where catalog seeding runs at startup, and call
`importCreatureSeeds`/`importSpellSeeds` with it. Bump each entry's
`version` field when you materially change it so curators can track
revisions (see `docs/runbooks/catalog-curation.md`).
