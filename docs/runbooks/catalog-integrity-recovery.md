# Recovering from preseed catalog integrity failures

Run `checkCatalogIntegrity(db)` (`src/db/catalog/integrity.ts`) to get a
report of `{ orphanedBucketTags, duplicateKeys, healthy }`.

## Orphaned bucket tags

A row in `catalog_bucket_tags` whose `entity_id` no longer has a matching
`catalog_creatures`/`catalog_spells` row. This shouldn't happen through
normal code paths (`upsertCreature`/`upsertSpell` always call
`replaceBucketTags` after a successful write, and nothing deletes a
creature/spell row directly), so seeing one means a row was deleted
outside the repository layer (e.g. a manual `DELETE` during a hotfix).

**Recovery**: delete the orphaned tag rows directly —
`DELETE FROM catalog_bucket_tags WHERE entity_id = ?` — they carry no
data worth preserving on their own. If the missing creature/spell was
deleted by mistake, re-import it from the seed file instead
(`importCreatureSeeds`/`importSpellSeeds`), which will recreate both the
row and its tags.

## Duplicate canonical keys

`catalog_creatures.key` and `catalog_spells.key` both have a `UNIQUE`
constraint, so this should be structurally impossible through the
`upsertCreature`/`upsertSpell` path. The check exists as defense in
depth for data that reached the table through some other route (a
restored legacy save, a manual SQL fix during an incident).

**Recovery**: keep the row with the higher `version` (and the most
recent `created_at` if versions tie), delete the other, and re-point any
`catalog_bucket_tags` rows referencing the deleted row's `id` at the
surviving row's `id` before deleting it.

## When to run the check

Call it after any out-of-band data fix (manual SQL, a restored save) and
as a one-off sanity check after upgrading a save through a new catalog
migration — see `src/db/catalog/compatibility.test.ts` for the
regression test covering pre-catalog saves upgrading cleanly.
