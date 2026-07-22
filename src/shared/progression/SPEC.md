# XP awards and level-up perks

Engine-authoritative progression: the agent makes exactly one judgment call (a difficulty rating), the engine owns all XP math and narration templates, and perks apply deterministically.

## XP sources

| `XPSource` | When it fires |
|------------|---------------|
| `encounter_end` | Combat encounter resolves with `outcome: defeated` and at least one XP-earning foe |
| `quest_complete` | Character quest status → `completed`, or story thread terminal state synced to linked main quest |

**Orchestration order:** XP award → level-up ceremony (if threshold crossed) → loot. Loot must not run before level-up gates clear.

**Same-turn dedupe:** encounter XP and quest XP are separate sources — both may fire the same turn (encounter then quest beat), each awarding once for its source. When `storyThreadUpdate` and `questCompletions` both complete the same main quest, reward passes dedupe on `questId`.

## XPContext

Assembled per source (shared foe summaries with loot):

- **Encounter:** defeated foes (`slain`, `incapacitated`, `surrender` — not `flee`), combat tier, buckets, round count, region, player level, party comp (companion archetypes + levels)
- **Quest:** `questId` (preferred), legacy `questThreadId`, hook text, quest scale (`minor` | `major`), region, player level, party comp

Skip the XP agent (`shouldSkipXpPass`) when the source is `encounter_end` and no foe has an XP-earning outcome (all fled).

## Difficulty-rated XP (engine authoritative)

The agent (`resolveXpAward`, `src/agents/xp.ts`) is asked to rate how difficult the accomplishment was **for this party** and returns only `{"difficulty": ...}` — no numbers, no prose. The call carries a small explicit `maxTokens` cap (`XP_DIFFICULTY_MAX_TOKENS`). Invalid ratings retry up to `MAX_SCHEMA_ATTEMPTS`; exhaustion falls back to `fallbackDifficulty` (`hard` for major quests, else `medium`) — the reward pass never fails.

The engine (`src/engine/difficultyXp.ts`) converts the rating into XP as a fixed fraction of the character's current level-up span (`LEVEL_XP_THRESHOLDS` gap), so pacing is level-independent:

| Difficulty | Fraction of level span |
|------------|------------------------|
| `easy` | 5% |
| `medium` | 10% |
| `hard` | 20% |
| `extreme` | 35% |
| `impossible` | 60% |

At max level the final threshold gap is used (XP still accrues). Awards are never below 1 XP. Narration is a deterministic template keyed by difficulty and source (`difficultyXpNarration`).

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
- `detectEmergentDirection` on tagged events (see [`rulesHonesty/SPEC.md`](../rulesHonesty/SPEC.md) for the full detect → level-up offer → template persist loop)
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

- `xp_awarded` — source, amount, difficulty rating, new xp total
- `level_up` — old level, new level
- `perk_chosen` — perk id, category, level gained
