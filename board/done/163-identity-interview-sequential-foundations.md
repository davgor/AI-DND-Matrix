# 163 — Identity interview must follow Who → Why → Where → What

Local LLMs skip the Why step in guided creation: after the Who opener they jump to Where (regions are always in the system prompt, and turn prompts say “ask follow-up questions freely” with no order gate). Enforce the intended four-question sequence in prompts and schema validation.

## Intended sequence

1. **Who** — Grounded opener: you are (name/description), background has you (background); any other details to add?
2. **Why** — Why are you here and adventuring?
3. **Where** — Where are you starting? (choices seeded from generated campaign regions)
4. **What** — What are you doing at the start of the adventure?

## Acceptance criteria

- [x] Shared foundation specs / agent prompts describe the sequential meanings above (What = starting activity, not generic traits)
- [x] Kickoff prompts Who only in the grounded “any other details?” style; fallback opener does not blur into Where
- [x] Interview turns instruct the DM to ask only the next incomplete foundation in order Who → Why → Where → What
- [x] Region list and Where-locking instructions appear only when Where (or later) is the active foundation — not during Who/Why
- [x] Schema validation rejects locking a later foundation while an earlier one is still incomplete (forces retry); unit tests cover Who→Where skip rejection and ordered lock acceptance
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI (`pr-checks.yml` + `deadcode.yml`) pass
