# 104 — Simplify update-ready copy

Shorten the auto-update ready banner/message (and CTA) to plain “Restart and update” instead of the longer “Restart to apply silently — no installer” / “Restart & Install” wording.

## Acceptance criteria

- [x] Ready-state update message is `Restart and update`
- [x] Ready banner button label is `Restart and update`
- [x] Tests cover the new copy
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
