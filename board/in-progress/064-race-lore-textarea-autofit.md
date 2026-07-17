# 064 — Race lore textareas autofit content

On race selection, the "What X means in this land" lore fields (Summary, Appearance, Culture, Role, Story hooks) use fixed-height textareas. Generated lore is often a line or two taller than the box, which produces tiny useless scrollbars instead of showing the full text.

## Acceptance criteria

- [x] Race lore multiline textareas grow to fit their content so full lore is visible without scrolling
- [x] Empty / short lore fields still keep a reasonable minimum height
- [ ] `npm test`, `npm run lint`, `npm run build` pass
