# 056 — Campaign delete includes campaign_races

Deleting a campaign created after epic 030/054 fails because `campaign_races` rows (written during NPC race realization) are not removed before `characters` or `campaigns`, tripping SQLite foreign keys.

## Acceptance criteria

- [x] `deleteCampaignCascade` removes `campaign_races` for the campaign inside the same transaction
- [x] Unit test seeds `campaign_races` (with `created_by_character_id`) and verifies full cleanup with `foreign_keys = ON`
- [x] Contract test: create campaign via `createCampaignFromRequest`, delete via `deleteCampaignById`, assert `ok: true` and zero rows across campaign-scoped tables
- [x] `npm run lint`, `npm run build` pass (`npm test` blocked locally by locked `better-sqlite3` — run after closing Electron)
