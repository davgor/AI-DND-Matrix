# Campaign hub smoke test

Manual and automated checks for epic **038** (campaign hub, multi-character cast, shared world).

**Last recorded pass:** 2026-06-30 (automated subset, mock provider)

**Provider used for manual pass:** Claude or Player2 mock in CI

## Prerequisites

- `npm install` and `npm run dev` (or packaged `.exe` with `.env`)
- At least one hub-eligible campaign (one player with `guided_creation_phase === 'complete'`)

## Automated subset

```bash
npm test -- src/shared/campaignHub src/main/campaignHubIpc.test.ts src/main/characterDeath.test.ts src/shared/guidedCreation/stageRouting.test.ts src/renderer/src/campaignHub src/agents/campaignGenerationHistory.test.ts src/main/narrationLogCharacterScope.test.ts src/db/campaignHubSmoke.test.ts
```

Covers: hub eligibility types, hub gate routing, death persistence, hub snapshot IPC, hub UI components, history-aware region prompt, per-character narration scope.

## Manual flow (full matrix)

1. **Hub gate** — Create campaign, complete first character through guided opening scene, return to sidebar, re-select campaign. Expect **Campaign Hub** (not PlayView). Header shows campaign name and premise.
2. **Cast rail** — Living character shows **Resume**; dead character shows skull and **View obituary**.
3. **Generate region** — Click **Generate another region**, submit seed. Hub preview refreshes with new region.
4. **Second character** — **Create new character**, full mechanical + guided flow. New entry appears on cast rail after completion; opening scene enters play for new character.
5. **Cross-character encounter** — Play as second character in same region as first; inactive first character may be proxied.
6. **Death + obituary** — Under legendary, die in combat. Expect modal **"Drafting your obituary"**, then hub with skull on cast rail.
7. **Hub obituary modal** — **View obituary** blocks Resume and Create until dismissed.
8. **Ungenerated travel** — Travel to a destination name with no region row. Turn blocks until generation completes or shows error.

## Expected UI strings

| Step | String |
|------|--------|
| Death drafting | `Drafting your obituary` |
| Obituary failure | `An obituary could not be written` |
| Hub generate | Same region modal as campaign review |
