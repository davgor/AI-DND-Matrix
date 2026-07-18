# 068 — Show Race on NPC traits card

NPC generation already assigns and persists `raceKey` (epics **049** / **052**), but Campaign Review's Traits panel only shows Temperament, Alignment, Gender, Class, and Background. Speaking NPCs with a race look incomplete next to those other identity fields.

## Acceptance criteria

- [x] Campaign Review NPC Traits shows a **Race** row when `npc.raceKey` is set (preset label from roster; custom label from `campaign_races` when provided)
- [x] Race row is hidden when `raceKey` is null (non-speaking / legacy NPCs)
- [x] Unit tests cover show/hide (and custom catalog label when `campaignRaces` is passed)
- [x] `npm test`, `npm run lint`, and `npm run build` pass
