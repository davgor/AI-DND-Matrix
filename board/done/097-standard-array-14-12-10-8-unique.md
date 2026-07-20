# 097 — Standard array values 14/12/10/8 with unique assignment

Update the character-setup standard array so the fixed scores are 14, 12, 10, and 8, and each value can be assigned to only one ability (dropdown options exclude scores already chosen elsewhere). Point buy and roll-for-stats are unchanged.

## Acceptance criteria

- [x] `STANDARD_ARRAY` is `[14, 12, 10, 8]` and `resolveStandardArray` accepts only a permutation of those values (engine tests)
- [x] Standard-array dropdowns omit values already assigned to other abilities; the current ability still shows its own selection (unit test for available options + UI wires the helper)
- [x] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
