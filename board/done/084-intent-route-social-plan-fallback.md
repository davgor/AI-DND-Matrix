# 084 — Intent+route: fall back when social turns omit routingPlan

Social / no-check turns still require a `routingPlan` from the merged LLM call (`interpretIntentAndRoute`, 040.2). Models often return a valid `{ "intent": { "checkNeeded": false } }` and omit or botch `routingPlan`, which exhausts `MAX_SCHEMA_ATTEMPTS` and throws `DmSchemaError` — failing the whole `turn:resolve` for a simple conversation.

Hardening: when the **intent** half validates, synthesize a conservative routing plan instead of retrying/throwing on a missing or invalid plan. Keep throwing only when the intent/JSON half is unusable.

## Acceptance criteria

- [x] Valid no-check intent with omitted `routingPlan` succeeds in one call; plan targets present NPCs (`converse` + `npcResponse`) or `dmNarration` when none are present
- [x] Valid intent with an invalid `routingPlan` succeeds with the same fallback (no retry burn)
- [x] Check-needed intent with omitted plan still gets a `dmNarration` beat via the fallback
- [x] Rest/travel/modifyItem/combat bypass intents may still omit the plan (inert empty plan) — unchanged
- [x] Completely invalid JSON / invalid intent still retries and throws `DmSchemaError` after `MAX_SCHEMA_ATTEMPTS`
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
