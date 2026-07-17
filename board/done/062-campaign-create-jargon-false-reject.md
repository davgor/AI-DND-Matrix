# 062 — Campaign create: jargon guard false-rejects across field boundaries

Real LLM campaign create can burn the full retry budget (5 seed × 3 stage attempts) and surface **"The narrative engine returned an invalid campaign"** even when each world/region field is individually fine.

Root cause: `meetsWorldTropeDiversity` / `meetsRegionTropeDiversity` join fields with a single `\n`, so `splitParagraphs` merges the last paragraph of one field with the first of the next. Hyphen-compound budgets that pass per field then fail only on the concatenated blob — the pipeline retries world/regions in a loop until it gives up.

## Acceptance criteria

- [x] World jargon/trope checks evaluate each world field separately (or equivalent boundary-safe join); a world whose fields each pass must pass `meetsWorldTropeDiversity`
- [x] Region jargon/trope checks are likewise boundary-safe across description / history / quests
- [x] Unit tests cover the false-reject boundary case (hyphen compounds at end of summary + start of history)
- [x] Still rejects stacked jargon within a single field and disallowed kraken/ziggurat tropes
- [x] `npm test`, `npm run lint`, `npm run build` pass
