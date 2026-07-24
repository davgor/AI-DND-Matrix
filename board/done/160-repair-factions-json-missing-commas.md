# 160 — Repair factions JSON missing commas / mashed relations

Campaign create fails at the factions stage with `CampaignGenerationSchemaError: DM agent did not return a valid factions schema after retries`. Live local dumps show:

1. **`reason=unparseable`** — model omits the comma between a string value and the next property (especially before `"deityName"`), so `JSON.parse` rejects the blob.
2. **`reason=invalid`** — model mashes two relation objects into one (`"summary":"...","factionAKey":"..."` instead of `"},{"factionAKey":"..."`). Duplicate keys collapse to a single relation; medium pressure requires ≥2 relations.

`tryParseJson` already strips fences and merges split objects; it should also repair these common local-model drift patterns so create does not burn three retries on recoverable JSON.

## Acceptance criteria

- [x] `tryParseJson` inserts missing commas between adjacent JSON values/properties (unit-tested with the live Eldergloom factions dump that lacked commas before `deityName`)
- [x] `tryParseJson` splits array objects when a duplicate key restarts a peer object (unit-tested with the mashed `relations` dump)
- [x] Repaired dumps pass `isValidGeneratedFactions(..., { deitiesPresent: true })` (normalize + pressure bands)
- [x] Campaign-create checklist smoke (`campaignCreateIpc.contract.test.ts` + related) and full delivery gate + act pass
