---
name: complete-ticket
description: Implement a specific ticket from this repo's /board ticket board, identified by an id like "001.1", "1.1", "004.7", or "13.9". Use whenever the user says to complete/do/work on/implement/finish a ticket by number (including just the bare number, e.g. "do 1.1" or "complete 004.7"), or asks what's left on a ticket. Moves the ticket through backlog -> in-progress -> done, implements it TDD-first per this repo's engineering standards, runs lint/tests/build, and checks off acceptance criteria only once actually verified.
---

# Complete a board ticket

This repo tracks work as text-file tickets under `/board` (`backlog/`, `in-progress/`, `done/`). Each ticket is a small, atomic unit of work with checkable acceptance criteria. This skill implements one ticket end-to-end the way this project requires — it does not cut corners on tests, lint, or scope.

## 1. Resolve the ticket id and find the file

- Normalize the id the user gave you: `1.1` -> `001.1`, `4.7` -> `004.7`, a bare epic number like `3` -> `003`. Zero-pad to 3 digits before the dot.
- Search `/board/backlog/`, `/board/in-progress/`, and `/board/done/` for a file starting with `<id>-` (sub-ticket) or matching `<id>-*.md` (epic).
- If the ticket is already in `/board/done/`, tell the user it's already done and stop — don't redo it without being asked.
- If it's in `/board/backlog/`, move it to `/board/in-progress/` with `git mv` before starting work.
- If you can't find a matching file, say so and ask for clarification rather than guessing.

## 2. Read context before writing any code

- Read the ticket file itself (Description + Acceptance Criteria).
- Read `README.md` at the repo root — it's the canonical summary of architecture, the rules engine, and the engineering process (TDD, oxlint strictness, security baseline, etc.).
- If the ticket references another ticket (e.g. "see ticket 004.22"), read that ticket too — sub-tickets often depend on types/functions another sub-ticket defines.
- Check whether prerequisite tickets this one depends on are actually done (e.g. don't implement 004.6 saving throws against a check-resolution function from 004.4 that doesn't exist yet). If a hard dependency is missing, say so and ask whether to do the dependency first instead of improvising a stand-in.

## 3. Implement TDD-first

This repo's standing rule: tests are written before the implementation that satisfies them, for everything in `/engine`, `/db`, and agent context-assembly/orchestration logic. For each acceptance criterion that names a behavior:

1. Write the failing test(s) for it first.
2. Implement the minimum code to make it pass.
3. Refactor only within the ticket's scope — don't drift into adjacent tickets' work.

UI-only criteria (visual layout, manual interaction flows) don't need a test-first cycle unless the criterion itself says "tested" — but still implement them carefully against the criterion's exact wording.

Respect the standing engineering rules while you work:
- TypeScript strict mode, no `any` escapes used to dodge a type problem.
- oxlint strict rules apply (complexity <= 10, function length ~50 lines, params <= 4, nesting depth 3). **Never relax, override, or disable a lint rule to make your code pass — fix the code.** If a rule seems genuinely wrong for a specific case, stop and ask the user before touching the lint config.
- `/engine` stays free of Electron, DB, or LLM-provider imports.
- Electron security baseline (contextIsolation/sandbox on, narrow typed IPC, no generic exec/SQL channel) is never weakened by a ticket's implementation.
- No telemetry, no secrets committed, `.env` stays gitignored.

## 4. Verify before checking anything off

Run the project's checks and only proceed once they're clean:
- `npm test` (or the specific test file(s) for this ticket if the full suite isn't relevant/ready yet)
- `npm run lint`
- `npm run build` if the ticket plausibly affects build output (always run it for scaffold/tooling tickets; use judgment for narrow engine/db tickets, but err toward running it)

If something fails, fix it — don't check off a criterion that doesn't actually pass, and don't mark the ticket done with failing checks.

## 5. Check off acceptance criteria and close out the ticket

- Edit the ticket file: change `- [ ]` to `- [x]` for each criterion you've actually verified (test passes, or you've manually confirmed the behavior per the criterion's wording). Don't check off something you didn't verify.
- If every criterion is checked, `git mv` the ticket file from `/board/in-progress/` to `/board/done/`.
- If the ticket is a sub-ticket (`NNN.M`), check whether every other `NNN.*` sub-ticket is already in `/board/done/`. If this was the last one, also move the parent epic file `NNN-*.md` to `/board/done/` (the epic file's job is just to index its sub-tickets, so it's done when they all are).
- If only some criteria could be completed (e.g. genuinely blocked on something), leave the ticket in `/board/in-progress/`, leave the unmet boxes unchecked, and clearly tell the user what's blocking it instead of force-completing.

## 6. Spin off follow-up tickets for anything out of scope

While implementing, you'll sometimes notice real work that doesn't belong in *this* ticket — a shortcut taken for now that needs hardening later (e.g. a dev-only CSP allowance that must be stripped before release), a TODO that needs its own pass, a gap the ticket's acceptance criteria didn't anticipate. Don't silently let it slide, and don't scope-creep the current ticket to cover it either.

- Write a new sub-ticket file in `/board/backlog/` following the existing format (Description + checkable Acceptance Criteria), numbered as the next `NNN.M` under whichever epic it logically belongs to (bump `M` past the highest existing sub-ticket for that epic; don't renumber existing ones).
- Reference the originating ticket in the new ticket's Description so the "why" isn't lost (e.g. "Ticket 001.3 added a baseline CSP that allowlists the dev server... should be removed before release").
- Update that epic's index file (`NNN-*.md`) to include the new sub-ticket in its list and range.
- Only do this for genuinely real, scoped follow-up work — not vague "consider revisiting X someday" notes. If you're not sure it's worth a ticket, mention it in your report instead of creating one.

## 7. Report back

Summarize concisely: what was implemented, which files changed, what test/lint/build output confirmed it, and which ticket(s) moved to `done`. Call out any new follow-up ticket(s) you created per step 6, by id. Do not create a git commit unless the user explicitly asks for one — staging the `git mv` of ticket files is fine, but committing is a separate, explicit step per this project's git safety rules.
