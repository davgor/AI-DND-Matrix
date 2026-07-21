# 123 — Quest log checkboxes and buttons match app theme

Quest Log modals portal to `document.body` (outside `.app-root`), so default browser checkboxes and action buttons ("Track quest", etc.) render with native light chrome instead of the gold-bordered dark theme used elsewhere.

## Acceptance criteria

- [x] Quest log objective checkboxes use dark/gold themed styling (not native white system checkboxes)
- [x] Quest log action buttons ("Track quest", "Abandon", curate actions) use the app's gold-bordered button theme
- [x] Component/CSS coverage asserts themed control hooks where cheap
- [x] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
- [x] `act` workflows `pr-checks.yml` and `deadcode.yml` succeed
