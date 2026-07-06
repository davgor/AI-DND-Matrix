# 053 — Onboarding back navigation persistence

Race and background selection lose form state when the user navigates back (equipment → background, background → race, or race → character setup). Saved selections should reload from the character record; in-progress drafts should survive stage changes.

## Acceptance criteria

- [ ] Equipment Back restores background dropdown and story from persisted character fields
- [ ] Background Back restores race selection (dropdown, lore, custom fields) from persisted data
- [ ] Race Back preserves in-progress race form via draft storage when race is not yet applied
- [ ] Back navigation reverts `guided_creation_phase` so apply IPC succeeds on re-confirm
- [ ] Unit tests cover hydration, phase revert rules, and draft resolution
- [ ] `npm test`, `npm run lint`, and `npm run build` pass
