# 057 — World layer naming, history hook, summary regen on save

World names should be planetary/cosmic scale; kingdoms belong in regions. World history should be five full hook paragraphs plus a three-paragraph summary. Saving world history from the modal regenerates the summary and keeps the modal open.

## Acceptance criteria

- [x] World generation prompts require planetary/cosmic `worldName`; region prompts own kingdoms/realms
- [x] World history validation expects five paragraphs; generation prompts describe hook-style one-pager
- [x] `editWorldHistory` regenerates `worldSummary` via agent when history is saved
- [x] World history modal does not auto-close on save; shows saved state
- [x] Tests + contract fixtures updated; lint/build pass
