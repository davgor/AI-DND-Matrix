# XP awards and level-up perks

Progression mirrors epic **035** loot: engine-authoritative budgets, agent narration within bounds, deterministic mechanical application for perks.

## XP sources

| `XPSource` | When it fires |
|------------|---------------|
| `encounter_end` | Combat encounter resolves with `outcome: defeated` and at least one XP-earning foe |
| `quest_complete` | Character quest status → `completed`, or story thread terminal state synced to linked main quest |

**Orchestration order:** XP award → level-up ceremony (if threshold crossed) → loot. Loot must not run before level-up gates clear.

**Same-turn dedupe:** encounter XP and quest XP are separate sources — both may fire the same turn (encounter then quest beat), each awarding once for its source. When `storyThreadUpdate` and `questCompletions` both complete the same main quest, reward passes dedupe on `questId`.

## XPContext

Assembled per source (shared foe summaries with loot):

- **Encounter:** defeated foes (`slain`, `incapacitated`, `surrender` — not `flee`), combat tier, buckets, round count, region, player level
- **Quest:** `questId` (preferred), legacy `questThreadId`, hook text, quest scale (`minor` | `major`), region, player level

Skip XP agent when `XPBudget.max === 0` (all fled / zero earners).

## XPBudget (engine authoritative)

`resolveXPBudget(context)` returns `{ min, max, suggested }`. Agent proposes integer `xpAmount`; server clamps with `clampXPProposal(amount, budget)` before `awardXP`.

### Encounter base values (pre-level-scaling)

| Signal | Base XP per foe |
|--------|-----------------|
| `villager` tier | 20 |
| `retired_adventurer` tier | 60 |
| `catalog` tier | 40 (+10 per encounter round, capped +30) |

Only foes with outcomes `slain`, `incapacitated`, or `surrender` count. `flee` yields nothing.

### Quest base values (pre-level-scaling)

| Scale | Base band |
|-------|-----------|
| `minor` | 80–120 |
| `major` | 250–400 |

### Level scaling

Let `rawTotal` be the sum of encounter foe bases or quest midpoint. Then:

- `min = max(0, floor(rawTotal * 0.6 / playerLevel))`
- `max = max(min, floor(rawTotal * 1.2 / max(1, playerLevel - 1)))` when `playerLevel > 1`, else `floor(rawTotal * 1.2)`
- `suggested = floor((min + max) / 2)`

Level 10 characters earn proportionally less from trivial level-1 wolf packs; major quests still exceed routine bandit skirmishes at the same level.

## Level-up ceremony

When `awardXP` crosses one or more thresholds:

1. Append `level_up` event per threshold crossed
2. Queue one ceremony per level gained (sequential picks)
3. Block `resolvePlayerTurn` until the queue is empty
4. Each ceremony: perk agent returns **exactly 3** `PerkProposal`s; player **selects 1**; engine applies via `applyPerk`

### Multi-level awards

Level 1→3 from a large quest queues **two** ceremonies. Activity context for each ceremony uses events since the **previous level threshold** (`lastLevelUpXp` boundary), not the full span for both.

## LevelSpanContext

Built when a ceremony starts. Includes since `stats.lastLevelUpXp`:

- campaign events (player actions, combat, checks)
- journal entries (027)
- log book entries (025)
- tagged activity counts: `combat`, `arcane`, `social`, `exploration`
- `detectEmergentDirection` on tagged events
- archetype from character row

Tag sources: event payload `activityTag` or inferred from event `type` (`combat_attack` → `combat`, check tags from payload).

### Activity examples

| Play pattern | Expected perk lean |
|--------------|-------------------|
| Fighter + library arcane study | `spell_access` or arcane `custom_feature` among options |
| Fighter leveled through combat | `extra_attack`, `ac_bonus`, martial `custom_feature` |

## PerkCategory (engine-owned)

| Category | Engine applies |
|----------|----------------|
| `ac_bonus` | +1 AC from perks (stack cap 3) |
| `extra_attack` | `stats.hasExtraAttack = true` |
| `spell_access` | Grant `catalogSpellKey` to `stats.knownSpellKeys` (validated) |
| `hp_max_bonus` | +2 max HP |
| `check_proficiency` | Add ability proficiency tag (`body`/`agility`/`mind`/`presence`) |
| `passive_feature` | `computeFeatureFromTemplate` + agent flavor (004.23) |
| `custom_feature` | Homebrew path via `computeFeatureFromTemplate` |

Agents supply **category + flavor only** — numeric stats are ignored if present.

## Events

- `xp_awarded` — source, amount, clamped flag, new xp total
- `level_up` — old level, new level
- `perk_chosen` — perk id, category, level gained
