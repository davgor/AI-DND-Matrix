# Encounter and quest loot

Realistic loot resolves at two beat points — **encounter end** and **quest completion** — using engine-authoritative policy envelopes. By default (epic 040.7) a **deterministic selector** picks grants from the policy-filtered catalog with template narration and **zero LLM calls**; with `ENRICH_REWARD_NARRATION=true` the loot agent retrieves from catalog or proposes flavor within bounds instead. Grants persist through the existing item pipeline (epic 024) on both paths.

## Default deterministic path (040.7, zero-LLM)

`selectLootDeterministic` (`src/main/lootSelector.ts`) replaces the LLM as the default item picker:

- **Pick strategy:** seeded Fisher–Yates shuffle of the policy-filtered catalog candidates; the seed derives from campaign id + source + foe npc ids (or quest/thread id), so the same resolution is idempotent while different encounters vary.
- **Grant count:** seeded pick in `[1, maxGrantCount]`, capped by candidate count; empty candidates → `nothingToFind`.
- **Variety guard:** item ids from recent `loot_resolved` events are deprioritized so repeated encounters don't grant identical items.
- **Narration:** template one-liner per source built from the granted item names (`src/main/rewardNarrationTemplates.ts`).

Accepted behavior changes while enrichment is off (intended, not bugs):

- Homebrew catalog growth via `proposeNew` stops — the selector only grants existing catalog items.
- XP awards use difficulty-rated engine amounts (ticket 061): the LLM rates difficulty, `src/engine/difficultyXp.ts` computes the XP, and `xp_awarded` events carry `difficulty`.

Set `ENRICH_REWARD_NARRATION=true` in the environment (read by `src/main/rewardEnrichment.ts`) to restore the prior LLM behavior described below.

## Loot sources

| `LootSource` | When it fires |
|--------------|---------------|
| `encounter_end` | Combat encounter resolves with `outcome: defeated` and at least one lootable foe |
| `quest_complete` | Character quest → `completed`, or story thread terminal state synced to linked main quest |

**XP ordering (epic 036):** when XP awards exist, run XP → level-up ceremony (if threshold crossed) → loot. Loot must not run before level-up gates clear.

## LootContext

Assembled per source:

- **Encounter:** per-foe summaries (`catalog` bucket, `combat_tier`, role, outcome), region id, player level/character id
- **Quest:** `questId` (preferred), legacy `questThreadId`, hook text (summary), quest scale (`minor` | `major`), region id, player level

### Lootable foes (encounter)

| Outcome | Lootable |
|---------|----------|
| `slain` | yes |
| `incapacitated` | yes |
| `surrender` | yes |
| `flee` | no (nothing left behind in v1) |

If no lootable foes remain, `maxGrantCount` is 0 and the loot agent is **not** called.

## LootPolicy (engine authoritative)

`resolveLootPolicy(context)` returns:

- `allowedItemTypes[]`
- `maxRarity`
- `maxGrantCount`
- `catalogRetrieveFirst: true`

Agents **cannot** exceed `maxRarity` or propose forbidden types — server validation drops invalid grants.

### Realism examples

| Source | Allowed types | Max rarity | Max grants |
|--------|---------------|------------|------------|
| Beast / wolf majority | `misc` only | `common` | 2 |
| Humanoid bandit | `misc`, `weapon`, `armor`, `potion` | `uncommon` | 3 |
| Mixed beast + humanoid | intersection (most restrictive) | lowest cap | 3 |
| Quest minor (e.g. miller errand) | `misc`, `potion` | `common` | 1 |
| Quest major | `misc`, `potion`, `weapon`, `armor` | `rare` | 2 |

**Anti-patterns (forbidden):**

- Greatsword or `magicItem` from a wolf pack
- Epic loot from “find my cat” minor hooks
- Loot when all foes fled with nothing left behind

### Mixed encounters

When multiple buckets contribute, allowed types are the **intersection** of per-bucket profiles; rarity is the **lower** of the caps.

## Exemplar tables

`listLootExemplarsForPolicy(policy)` returns flavor hints for the agent prompt. Exemplars are **suggestions only** — actual grants must use catalog retrieve or validated `proposeNew`.

## Agent output (enrichment path, `ENRICH_REWARD_NARRATION=true`)

Dedicated `resolveLoot()` call (not per-turn `narrate()`):

```json
{
  "narrationText": "short reward beat",
  "itemGrants": [{"catalogItemId":"..."}|{"proposeNew":{...}}],
  "nothingToFind": false
}
```

- `itemGrants.length` ≤ `maxGrantCount`
- `nothingToFind: true` when the scene has no salvage
- Never propose mechanical numbers — 024.3 derives stats

## Same-turn precedence

If encounter end and quest completion both fire in one player turn, **encounter loot runs first**. Quest loot is skipped when encounter loot already ran that turn (no duplicate grants).

## Events

Each loot pass appends `loot_resolved` with source, policy summary, accepted item ids, and rejected count. `narrationText` surfaces in the play exposition feed.

## Integration with 024

Grants use `ItemGrantProposal` shape, `validateAndPersistLootGrants`, and `persistItemGrants` / `canonicalizeProposedItem` for engine-derived mechanics.
