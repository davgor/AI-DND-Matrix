# Preseeded catalog taxonomy (v1)

The taxonomy spec is `src/shared/catalogTaxonomy.ts`. This doc explains the
model in prose; the TS file is the machine-readable source of truth that
seeding and retrieval code import directly.

## Bucket families (v1)

- `goblinoid` — goblins, hobgoblins, bugbears, and similar small raiding humanoids.
- `humanoid` — bandits, cultists, soldiers, and other "ordinary person" enemies.
- `dragonkin` — true dragons, drakes, wyrms, kobolds-as-dragon-worshippers.
- `undead` — zombies, skeletons, ghosts, liches.
- `fiend` — demons, devils, and other planar evil.
- `beast` — wolves, bears, giant spiders, mundane animals scaled to threat.
- `elemental` — fire/water/earth/air-aligned creatures.
- `construct` — golems, animated armor, clockwork guardians.

## Multi-bucket tagging

An entry can carry 1 to `MAX_BUCKETS_PER_ENTRY` (3) buckets. This covers
entries that legitimately span families (e.g. a kobold dragon-cultist could
be tagged `goblinoid` + `dragonkin`). Buckets must be unique per entry and
must all be members of `BUCKETS`.

## Extension rules

To add a bucket in a future revision:

1. Append it to the `BUCKETS` array — never rename or remove an existing
   bucket key, since seeded rows and saved campaigns reference bucket keys
   directly.
2. Bump `TAXONOMY_VERSION`.
3. Existing entries are unaffected until curators explicitly add the new
   bucket to them (see the curation workflow in
   `docs/runbooks/catalog-curation.md`).
