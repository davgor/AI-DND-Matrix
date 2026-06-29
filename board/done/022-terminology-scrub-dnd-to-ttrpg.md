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
