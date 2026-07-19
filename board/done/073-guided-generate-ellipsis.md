# 073 — Guided Generate button: cycling ellipsis

While Generate is in flight on the guided DM conversation composer, animate the button label the same way as the DM thinking status: `Generating.` → `Generating..` → `Generating...` → `Generating....` → repeat.

## Acceptance criteria

- [x] While `generating` is true, the Generate button label cycles through one to four trailing dots (unit-tested label helper)
- [x] Idle Generate label remains `Generate`; animation stops when generation finishes
- [ ] `npm test`, `npm run lint`, and `npm run build` pass
  - lint + build passed; targeted guided-creation tests passed
  - full `npm test` blocked: `better-sqlite3.node` locked (close the Electron app, then re-run)
