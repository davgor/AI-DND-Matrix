# EPIC: Preseeded TTRPG content catalog (enemies, monsters, spells)

Build a preseeded content catalog so AI systems can retrieve canonical entries before inventing new ones.

This epic introduces a bucketed taxonomy (for example goblinoid, humanoid, dragonkin, undead, fiend) and retrieval-first runtime behavior. Specific taxonomies and balancing details are expected to be iterated as implementation progresses.

Broken down into sub-tickets 023.1-023.11. This epic is done when all of them are.

Definition of done for this epic:
- structured storage exists for preseeded creatures, enemies, spells, and related traits
- taxonomy buckets are defined and applied consistently across seeded content
- AI/runtime retrieval path can query relevant entries by bucket, context, and constraints
- generation logic prefers retrieval of existing content over creating new entries by default
- fallback creation path remains available when no suitable seeded entry exists
- catalog supports iterative expansion and curation without destructive rewrites

023.1 taxonomy and bucket specification v1 · 023.2 DB schema for preseeded catalog entities · 023.3 seed content import pipeline and source format · 023.4 creature/enemy preseed dataset v1 with bucket tags · 023.5 spells and abilities preseed dataset v1 · 023.6 retrieval service and ranking for encounter/context fit · 023.7 AI prompt and decision policy (retrieve-first then create) · 023.8 fallback generation and canonicalization workflow · 023.9 curation/update workflow for expanding buckets and entries · 023.10 compatibility, migration, and data integrity checks · 023.11 preseed-catalog smoke and quality validation
