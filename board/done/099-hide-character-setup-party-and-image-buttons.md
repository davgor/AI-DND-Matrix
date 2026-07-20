# 099 — Hide character setup party/image buttons (temporary)

Temporarily remove the "Add party member", "Select Portrait", and "Select Sheet Background" buttons from character setup UI. Underlying draft/submit wiring stays so these can be re-enabled later.

## Acceptance criteria

- [x] Character setup no longer shows "Add party member", "Select Portrait", or "Select Sheet Background"
- [x] "AI Party Members" section header and any existing member rows still render
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
