# EPIC: Engineering delivery standards (agent skill)

Codify standing engineering process so every agent-led implementation in this repo follows the same bar: **TDD-first**, **lint + unit tests + build verified before done**, and **board traceability** (create or update a ticket/epic).

Relates to README engineering rules and the existing [complete-ticket](.claude/skills/complete-ticket/SKILL.md) skill (ticket-scoped work). This epic adds a **default delivery skill** for ad-hoc requests, bug fixes, and follow-ups that are not explicitly framed as "complete ticket NNN.M".

## Acceptance criteria

- [x] `delivery-standards` skill exists under `.cursor/skills/delivery-standards/SKILL.md` and `.claude/skills/delivery-standards/SKILL.md`
- [x] Skill states TDD-first, `npm test` + `npm run lint` + `npm run build` gate, and board ticket/epic update requirements
- [x] Skill references `complete-ticket` for named board work and `README.md` for architecture boundaries
- [x] `.cursor/rules/delivery-standards.mdc` exists with `alwaysApply: true` pointing at the skill
- [x] This epic file documents the policy on `/board`
