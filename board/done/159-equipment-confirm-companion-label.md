# 159 — Equipment confirm button should say Find your traveling companion

After starting gear selection, the proceed button still says **Tell me about yourself**, but confirming equipment advances to the **Traveling companion** screen (phase `companions`), not the identity interview. The label should match the next step.

## Acceptance criteria

- [x] Equipment selection proceed button label is **Find your traveling companion** when not submitting
- [x] Unit test asserts the proceed button shows that label (not identity interview copy)
- [x] Starting-equipment / guided-creation / companions smoke runbooks that mention the equipment confirm label are updated
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and act CI pass
