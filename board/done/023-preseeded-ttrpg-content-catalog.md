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

## Sub-tickets

### 023.1 Taxonomy and bucket specification v1

#### Description
Define the initial content taxonomy and bucket system used for preseeded entries.

#### Acceptance Criteria
- [x] Bucket model is documented with initial families (for example goblinoid, humanoid, dragonkin, undead, fiend)
- [x] Rules exist for multi-bucket tagging and edge cases
- [x] Taxonomy includes extension rules for adding new buckets later
- [x] A versioned taxonomy spec file exists and is referenced by seeding and retrieval logic

### 023.2 DB schema for preseeded catalog entities

#### Description
Add database schema support for preseeded catalog content and taxonomy relationships.

#### Acceptance Criteria
- [x] Tables exist for creatures/enemies, spells, abilities, tags, and bucket mappings
- [x] Schema supports provenance/source metadata and version tracking per seeded entry
- [x] Indices support fast retrieval by bucket, level/difficulty, and archetype filters
- [x] Migration tests verify install and upgrade behavior

### 023.3 Seed content import pipeline and source format

#### Description
Create an import pipeline for preseed data with a stable source format and validation.

#### Acceptance Criteria
- [x] Seed source format is documented and machine-validated
- [x] Import pipeline can ingest seed files idempotently
- [x] Validation catches malformed entries and reports actionable errors
- [x] Import process supports partial updates without duplicating canonical entries

### 023.4 Creature/enemy preseed dataset v1 with bucket tags

#### Description
Populate an initial curated set of enemy/monster entries tagged by taxonomy buckets.

#### Acceptance Criteria
- [x] Dataset v1 includes representative coverage across initial buckets
- [x] Each creature/enemy entry includes required gameplay fields and bucket tags
- [x] Dataset entries pass schema and taxonomy validation
- [x] Importing v1 yields stable, queryable catalog records

### 023.5 Spells and abilities preseed dataset v1

#### Description
Add an initial curated spell/ability catalog linked to relevant archetypes and buckets where applicable.

#### Acceptance Criteria
- [x] Dataset v1 includes core spell/ability coverage for early gameplay loops
- [x] Entries include required fields (effect type, range, cost, tags, constraints)
- [x] Spells/abilities can be filtered by context requirements and bucket tags
- [x] Dataset passes validation and imports without duplicates

### 023.6 Retrieval service and ranking for encounter/context fit

#### Description
Implement catalog retrieval and ranking so runtime systems can fetch best-fit preseeded entries.

#### Acceptance Criteria
- [x] Retrieval API supports filters by bucket, encounter context, level/difficulty, and tags
- [x] Ranking strategy prioritizes context fit and diversity constraints
- [x] Retrieval returns deterministic results for identical inputs unless randomness is explicitly configured
- [x] Unit tests cover ranking, filtering, and no-match behavior

### 023.7 AI prompt and decision policy (retrieve-first then create)

#### Description
Update AI decision flow to retrieve from preseed catalog first, then generate only when needed.

#### Acceptance Criteria
- [x] Prompt/decision policy explicitly attempts retrieval before creation
- [x] AI receives retrieved canonical entries in structured context
- [x] Creation path triggers only when retrieval confidence or availability is insufficient
- [x] Telemetry captures retrieve-hit vs create-fallback rates

### 023.8 Fallback generation and canonicalization workflow

#### Description
Define fallback generation behavior and optional canonicalization for newly created content.

#### Acceptance Criteria
- [x] No-match retrieval path can generate new content without blocking flow
- [x] Generated entries can be reviewed and optionally promoted into catalog as canonical seeds
- [x] Canonicalization avoids duplicate near-identical entries
- [x] Workflow preserves provenance between generated and promoted entries

### 023.9 Curation/update workflow for expanding buckets and entries

#### Description
Provide an operational workflow for incrementally expanding taxonomy buckets and seeded content.

#### Acceptance Criteria
- [x] Bucket/entry update process is documented with validation steps
- [x] Updating taxonomy or datasets can be performed without destructive data resets
- [x] Versioning/changelog exists for seed catalog revisions
- [x] Curated updates are reproducible across dev and packaged environments

### 023.10 Compatibility, migration, and data integrity checks

#### Description
Protect existing campaigns/saves while introducing preseed catalog data and retrieval-first logic.

#### Acceptance Criteria
- [x] Existing save/campaign data remains valid after schema and retrieval updates
- [x] Migrations are backward-safe and validated on upgrade paths
- [x] Integrity checks catch orphaned tags/mappings and duplicate canonical keys
- [x] Recovery guidance exists for integrity failures

### 023.11 Preseed-catalog smoke and quality validation

#### Description
Run end-to-end validation to confirm retrieval-first behavior works and seeded content quality is acceptable.

#### Acceptance Criteria
- [x] Smoke run confirms AI uses preseeded entries when suitable matches exist
- [x] Smoke run confirms fallback generation when no suitable preseed match exists
- [x] Validation report includes retrieve-hit rates, fallback rates, and notable quality issues
- [ ] Build/test/lint baseline remains green after catalog integration (test + lint are green; build's typecheck step currently fails on unrelated, concurrently in-progress epic 024 files — src/db/repositories/itemGrants.ts and src/main/turnIpc.ts — not on anything epic 23 touched)
