# Race selection (narrative-only)

Race is **world flavor** for AI grounding — not a mechanical modifier. No ability score bonuses, resistances, speed, or engine-enforced traits.

## Roster

Twenty predefined ancestries grouped into four categories:

| Category | Key |
|---|---|
| Common Folk | `common_folk` |
| Outsider Bloodlines | `outsider_bloodlines` |
| Monstrous & Feral | `monstrous_feral` |
| Uncanny & Otherworldly | `uncanny_otherworldly` |

Each predefined race has a stable `key` (lower_snake_case), a display `label`, and a fixed **seed prompt** describing what that ancestry normally is in generic fantasy terms. Seeds are authored data in `roster.ts`, not LLM-generated. Humans are framed as ordinary folk (no innate magic or shared birthright); their lore prompt also steers away from majestic / chosen-people tone.

## Custom races

`custom` is a sentinel key (`CUSTOM_RACE_KEY`) — not a `RaceRosterEntry`. Players supply a free-text seed when minting a custom race; the engine generates a campaign-scoped key (`custom_<uuid>`).

## Campaign race catalog

Per-campaign lore is generated once from seed + campaign premise + world summary, then locked in `campaign_races`. Subsequent references reuse the stored lore unchanged.

## Lore shape

```typescript
RaceLore {
  summary: string
  appearance: string
  culture: string
  roleInThisLand: string
  hooks: string[]
}
```
