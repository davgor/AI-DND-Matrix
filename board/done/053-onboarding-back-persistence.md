# 053 — Onboarding back navigation persistence

Race and background selection lose form state when the user navigates back (equipment → background, background → race, or race → character setup). Saved selections should reload from the character record; in-progress drafts should survive stage changes.

## Acceptance criteria

- [x] Equipment Back restores background dropdown and story from persisted character fields
- [x] Background Back restores race selection (dropdown, lore, custom fields) from persisted data
- [x] Race Back preserves in-progress race form via draft storage when race is not yet applied
- [x] Character setup Back from race restores name, alignment, ability scores, and point-buy / method preference
- [x] Back navigation reverts `guided_creation_phase` so apply IPC succeeds on re-confirm
- [x] Unit tests cover hydration, phase revert rules, and draft resolution
- [x] `npm run lint` and `npm run build` pass (`npm test` blocked locally by locked `better-sqlite3` — close the dev app and rerun)
