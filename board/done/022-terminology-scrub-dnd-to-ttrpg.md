# EPIC: Terminology scrub (DND -> TTRPG)

Replace DND-specific wording throughout the repository with neutral TTRPG terminology to reduce brand-specific references while preserving behavior and data compatibility.

Broken down into sub-tickets 022.1-022.10. This epic is done when all of them are.

Definition of done for this epic:
- user-facing text uses neutral TTRPG wording instead of DND-specific wording
- documentation and board language are updated consistently
- prompts/templates and generated copy defaults are updated for neutrality
- tests and fixtures are updated to match renamed text expectations
- packaging metadata and app branding strings are reviewed and updated where required
- no behavior regressions are introduced by text updates

022.1 terminology inventory and replacement map · 022.2 renderer UI text scrub · 022.3 main-process logs/errors and IPC label scrub · 022.4 agent prompts/templates and narrative copy scrub · 022.5 documentation and README scrub · 022.6 backlog/board wording scrub (non-moonshot) · 022.7 config/env/example strings and package metadata scrub · 022.8 tests/fixtures/snapshots wording alignment · 022.9 compatibility guardrails for persisted data and IDs · 022.10 repo-wide smoke check for terminology and regressions

## Sub-tickets

### 022.1 Terminology inventory and replacement map

#### Description
Build a complete inventory of DND-specific text and define approved TTRPG replacements before bulk edits begin.

#### Acceptance Criteria
- [x] A searchable inventory of DND-specific terms/phrases is produced across src, docs, scripts, and board files
- [x] A replacement map is documented (old phrase -> approved neutral phrase)
- [x] Reserved terms that must remain untouched (for compatibility or external protocol reasons) are explicitly listed
- [x] Inventory and replacement map are reviewed and committed before downstream tickets proceed

### 022.2 Renderer UI text scrub

#### Description
Update all renderer-visible copy to use TTRPG-neutral terms while preserving UX structure and flow.

#### Acceptance Criteria
- [x] Navigation labels, button text, empty states, prompts, and help text in renderer are updated to neutral TTRPG language
- [x] No layout breakage/regression is introduced by updated strings
- [x] Any user-visible residual DND-specific text in renderer is eliminated or explicitly waived
- [x] UI tests/snapshots are updated for changed strings

### 022.3 Main-process logs/errors and IPC label scrub

#### Description
Scrub DND-specific language from main-process logs, error messages, and IPC names/descriptions where safe.

#### Acceptance Criteria
- [x] Main-process log and error strings are updated to neutral TTRPG wording
- [x] IPC channel labels/messages are updated only when safe and non-breaking
- [x] Backward-compatibility shims are added where IPC renames could break existing callers
- [x] Unit tests are updated for changed message expectations

### 022.4 Agent prompts/templates and narrative copy scrub

#### Description
Update system/agent prompts and reusable narrative templates to neutral TTRPG wording while preserving gameplay intent.

#### Acceptance Criteria
- [x] Prompt templates in code/docs avoid DND-specific branding language
- [x] Narrative scaffolds still produce coherent gameplay outputs after wording changes
- [x] Prompt changes are covered by relevant tests or manual prompt sanity checks
- [x] Any intentionally retained legacy prompt text is documented with rationale

### 022.5 Documentation and README scrub

#### Description
Update repository documentation to TTRPG-neutral terminology, including project overview and setup docs.

#### Acceptance Criteria
- [x] README and top-level docs replace DND-specific references with neutral TTRPG language
- [x] Setup and usage docs remain accurate after terminology changes
- [x] Cross-links and examples are updated to match new terms
- [x] A quick docs smoke read verifies no contradictory old/new terms remain

### 022.6 Backlog/board wording scrub (non-moonshot)

#### Description
Normalize terminology across standard backlog and done/in-progress board files to align with TTRPG wording policy.

#### Acceptance Criteria
- [x] DND-specific wording in non-moonshot board files is replaced with neutral TTRPG wording
- [x] Ticket semantics and history context remain intact after wording updates
- [x] Numbering, links, and references are preserved
- [x] Spot check confirms board consistency after scrub

### 022.7 Config/env/example strings and package metadata scrub

#### Description
Update config examples, env docs, and package/app descriptive metadata to neutral TTRPG wording.

#### Acceptance Criteria
- [x] .env example/help text and config comments are terminology-neutral
- [x] package metadata strings (description/product copy where applicable) are updated to neutral wording
- [x] Any user-facing installer/package text reviewed for DND references
- [x] Changes do not break build/package workflows

### 022.8 Tests/fixtures/snapshots wording alignment

#### Description
Align tests, fixtures, and snapshots with the new terminology to keep CI stable after string changes.

#### Acceptance Criteria
- [x] String-based tests and snapshots are updated for renamed terminology
- [x] Fixture text is updated where assertions depend on specific wording
- [x] No failing tests remain due solely to outdated DND phrasing
- [x] Test run confirms wording changes are fully reflected

### 022.9 Compatibility guardrails for persisted data and identifiers

#### Description
Protect runtime/data compatibility when terminology updates intersect with persisted data, IDs, or protocol fields.

#### Acceptance Criteria
- [x] Persisted schema fields/IDs are reviewed to avoid destructive renames that break existing saves
- [x] Where renames are required, migration or compatibility shims are defined
- [x] External/public contract strings are versioned or aliased if changed
- [x] Manual load test verifies older save data still works after scrub

### 022.10 Repo-wide smoke check for terminology and regressions

#### Description
Run final repo-wide validation to confirm DND-specific text was scrubbed as intended and no regressions were introduced.

#### Acceptance Criteria
- [x] Repo search confirms target DND-specific terms are removed or explicitly waived
- [x] Key app flows smoke test pass after terminology changes
- [x] Build/test/lint baseline remains green
- [x] Final report summarizes remaining exceptions and rationale
