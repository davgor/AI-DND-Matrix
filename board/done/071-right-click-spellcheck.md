# 071 — Right-click spellcheck on editable text fields

Wire the existing Electron spellcheck helpers so typed text fields show misspellings and a right-click context menu with suggestions, Add to dictionary, and cut/copy/paste/select all.

## Acceptance criteria

- [x] Main process configures spellcheck languages and pops an editable context menu on right-click (`configureSpellcheck` on the main window)
- [x] Renderer enables `spellcheck` on textareas and text/search inputs (not password/number), including fields added after mount
- [x] Unit tests cover locale language selection, context-menu item building for misspellings/edit actions, and editable-field spellcheck attribute rules
- [x] `npm test`, `npm run lint`, and `npm run build` pass
