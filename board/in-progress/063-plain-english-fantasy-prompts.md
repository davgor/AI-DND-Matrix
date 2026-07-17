# 063 — Plain-English fantasy prompts (no purple jargon)

Campaign and lore generation still models stacked hyphen-compound fantasy jargon ("fog-dwellers", "rune-etched", "storm-priests") in prompt rules and JSON examples. That style reads like LLM purple prose and fights the jargon guard. Rewrite generation prompts, examples, random seeds, and related UI placeholders to ask for fantasy content in clear standard English.

## Acceptance criteria

- [x] `PROSE_CLARITY_RULES` (and world/region/NPC examples) instruct plain English fantasy; they no longer teach "hyphenated compounds are fine in moderation" with fog-/storm- examples
- [x] Race lore and background-story prompts include the same plain-English guidance
- [x] Random premise/region seed fillers and create/review placeholders use normal English fantasy phrasing
- [x] Fixtures (`VALID_WORLD`, realistic LLM worlds) stay in plain English and still pass the jargon guard
- [ ] Unit tests assert the new prompt language; `npm test`, `npm run lint`, `npm run build` pass
  - lint + build pass; prompt unit tests pass; full `npm test` blocked until Electron releases `better-sqlite3` (rebuild EBUSY)
