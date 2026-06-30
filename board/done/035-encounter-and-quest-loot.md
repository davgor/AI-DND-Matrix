# EPIC: Encounter and quest loot (realistic rewards)

Combat and quests resolve mechanically today but produce **no loot hook** into the item system (epic 024). `itemGrants` exist on the DM narration schema and `persistItemGrants` works — but only when the model volunteers loot mid-turn. Encounter end (031/034) and quest completion (`storyThreadUpdate`) never trigger a dedicated reward pass. That is almost certainly an oversight, not an intentional v1 cut.

This epic wires **realistic loot** at two beat points:

1. **Encounter end** — when a fight concludes (hostiles slain, surrendered, or fled per 034), resolve what the player actually gains from *those* opponents and the scene.
2. **Quest completion** — when a story thread moves to a completed state, resolve a quest-appropriate reward tied to what was accomplished.

**Realism policy (core constraint):** loot must match the source. A pack of wolves yields pelts, fangs, or misc salvage — not a +1 greatsword. A bandit might drop stolen coin, a worn dagger, or patchwork armor. A quest reward from the miller might be grain, a family heirloom trinket, or modest coin — scaled to the hook, not random high-tier gear. The **engine** owns allowed item types and max rarity per loot context; agents retrieve from catalog or propose flavor within those bounds (same guardrail pattern as 024.3 / 023 retrieve-first).

**Companion epic:** **036** wires XP awards and agentic level-up perks at the same trigger points. Orchestration order: XP → level-up ceremony (if threshold crossed) → loot (035.8 / 036.8).

Broken down into sub-tickets 035.1–035.10. This epic is done when all of them are.

Definition of done:
- shared types document loot sources, policy envelopes, and grant validation
- engine derives allowed item types + max rarity from encounter foes (catalog bucket, role, tier) and quest tier
- encounter-end and quest-completion each assemble a `LootContext` and run a dedicated loot resolution pass
- loot agent retrieve-first from item catalog; proposals outside policy are clamped or rejected
- grants persist via existing `persistItemGrants` / canonicalization (024)
- loot events append for narration/inventory grounding; player sees new items on character sheet
- smoke test: wolf encounter → misc salvage only; humanoid foe → plausible gear; quest complete → hook-appropriate reward — never a greatsword from wolves

035.1 loot spec + shared types · 035.2 engine loot policy resolver (types + max rarity) · 035.3 bucket/role loot profile tables · 035.4 encounter-end loot context assembly · 035.5 quest-completion loot context assembly · 035.6 loot resolution agent + schema (retrieve-first) · 035.7 loot grant validation + persist pipeline · 035.8 orchestration hooks (encounter end + quest complete) · 035.9 loot events + reward narration · 035.10 end-to-end loot smoke test

## Sub-tickets

### 035.10 End-to-end loot smoke test

#### Description
Validate realistic loot with scripted provider + DB harness (mirror 024.11 / item system smoke).

**Scenario A — wolf pack (encounter end):**
- Defeat beast-bucket foes (catalog wolf or beast NPC)
- Loot pass grants only `misc` (pelts/fangs); **no** weapon or magicItem in inventory

**Scenario B — humanoid bandit (encounter end):**
- Defeat humanoid foe
- Loot may include common/uncommon weapon or misc coin — within policy

**Scenario C — quest completion:**
- Transition story thread to `completed` for minor hook (e.g. miller errand)
- Loot matches hook (coin, misc trinket) — not epic-tier gear

Deliver: `src/db/encounterQuestLootSmoke.test.ts`, `docs/runbooks/encounter-quest-loot-smoke-test.md`

#### Acceptance Criteria
- [x] Wolf scenario asserts inventory contains no `weapon`/`magicItem` grants
- [x] Bandit scenario asserts at least one grant within humanoid policy
- [x] Quest scenario asserts grant matches minor quest policy ceiling
- [x] All grants use engine-derived mechanics (024.3), not agent numbers
- [x] Runbook documents manual verification

### 035.1 Loot spec + shared types

#### Description
Document loot resolution and add shared types under `/shared`.

Cover:
- **`LootSource`**: `encounter_end` | `quest_complete`
- **`LootContext`**: source, defeated/surrendered foe summaries (catalog bucket, `combat_tier`, role, count), region id, story thread id + quest hook text when applicable, player level (for ceiling clamp)
- **`LootPolicy`**: `allowedItemTypes[]`, `maxRarity`, `maxGrantCount`, `catalogRetrieveFirst: true`
- **realism rules** with examples:
  - beast / wolf / mindless undead → `misc` (and `potion` only if alchemical parts make sense); `common` max; no weapons/armor/magicItem
  - humanoid bandit/villager → `weapon` | `armor` | `misc` | `potion`; `uncommon` max from routine foes
  - quest giver reward → types fit hook; `rare` max for significant threads; never exceed player level band
- **anti-patterns**: explicitly forbid high-tier weapons from animal encounters; forbid loot when all foes fled with nothing left behind (034 `flee` with empty scene)
- **XP hook point**: epic **036** awards XP at same triggers; run before loot
- integration with 024 `ItemGrantProposal` shape

#### Acceptance Criteria
- [x] Spec documents encounter vs quest loot differences and realism examples (wolves vs bandits vs quest reward)
- [x] Shared types export `LootSource`, `LootContext`, `LootPolicy`, `LootResolutionResult`
- [x] Spec states engine policy is authoritative; agents cannot exceed `maxRarity` or forbidden types
- [x] Unit tests validate policy envelope parsing and guard helpers

### 035.2 Engine loot policy resolver (types + max rarity)

#### Description
Pure `/engine` function: `resolveLootPolicy(context: LootContext): LootPolicy`.

Deterministic rules (exact table in 035.1), e.g.:
- aggregate defeated foes by catalog bucket (`beast`, `humanoid`, `undead`, …) and worst-case tier
- beast-majority encounter → `allowedItemTypes: ['misc']`, `maxRarity: 'common'`, `maxGrantCount: 2`
- humanoid encounter → weapons/armor/misc/potion allowed, `maxRarity: 'uncommon'`, `maxGrantCount: 3`
- mixed encounter → intersect or use **most restrictive** type set, document choice
- `quest_complete` with thread summary keywords / tier flag → higher `maxRarity` but still clamped (no epic loot from "find my cat")
- empty encounter (all fled, nothing to loot) → `maxGrantCount: 0`

No DB or LLM imports.

#### Acceptance Criteria
- [x] Wolf/beast-only context never allows `weapon` or `magicItem` types
- [x] Bandit/humanoid context allows at least `misc` and `weapon` with `uncommon` cap
- [x] Quest-complete policy is stricter than dungeon boss fanfiction — tested with minor-hook fixture
- [x] Unit tests cover beast, humanoid, mixed, empty, and quest scenarios

### 035.3 Bucket/role loot profile tables

#### Description
Seed deterministic **loot profile hints** the resolver and agent can use — not random tables with percentages in v1, but canonical allowed exemplars per bucket.

Deliver as `/engine` or `/shared` constants (and optional catalog creature `lootTags` if a small migration is justified):
- `beast` → misc names/themes: hide, fang, claw, trophy bone
- `humanoid` → worn weapons, coin pouch, travel rations misc, light armor
- `undead` → misc salvage only unless intelligent humanoid undead flagged
- `quest_reward_minor` → coin, misc trinket, common potion
- `quest_reward_major` → uncommon weapon/armor or rare misc — still engine-clamped

Expose `listLootExemplarsForPolicy(policy)` returning flavor hints for the agent prompt (not grants themselves).

Document that exemplars are **suggestions**; actual grants still go through catalog retrieve or validated `proposeNew`.

#### Acceptance Criteria
- [x] Profile tables cover at least beast, humanoid, and quest minor/major buckets
- [x] Beast profiles contain zero weapon entries
- [x] Exemplar list is deterministic and unit-tested
- [x] Optional creature `lootTags` migration documented if implemented; otherwise bucket-only is acceptable for v1

### 035.4 Encounter-end loot context assembly

#### Description
When an encounter ends (031.6 / 034.6 `combat_ended`), assemble `LootContext` for `LootSource.encounter_end`.

Input from persisted encounter + events:
- each foe outcome: `slain` | `surrendered` | `fled` | `incapacitated` (034)
- NPC/catalog link: `catalog_creature_key`, bucket (from catalog or inferred), `combat_tier`, `role`
- region id, player character id/level
- **lootable bodies**: slain + incapacitated + surrendered (document); fled foes contribute nothing unless engine flag `leftGearBehind` (default false)

If `maxGrantCount` would be 0 (nothing lootable), skip loot agent call entirely.

#### Acceptance Criteria
- [x] Context built from `combat_ended` event payload with per-foe outcomes
- [x] All-fled encounter produces empty lootable set → no loot pass
- [x] Wolf catalog fixture produces beast-majority context
- [x] Unit tests for slain bandit + slain wolf mixed encounter

### 035.5 Quest-completion loot context assembly

#### Description
Detect quest completion and assemble `LootContext` for `LootSource.quest_complete`.

Trigger when DM `storyThreadUpdate` sets thread `state` to a completed value (define allowed tokens in 035.1: e.g. `completed`, `resolved`, `done`) **or** when a dedicated quest-complete engine gate fires if you add one.

Context includes:
- story thread id, title, summary, original quest hook text (from world facts `quest_hook` or thread summary)
- region id, quest giver npc id if known from log book / thread metadata
- player level
- quest scale heuristic: `minor` | `major` from summary length / explicit thread field / engine rule

Do not loot on every `storyThreadUpdate` — only on transition into completed state (compare previous vs new in `turnIpc` or `persistNarrationSideEffects`).

#### Acceptance Criteria
- [x] Loot context built only on completed-state transition, not every thread update
- [x] Quest hook text included in context for agent grounding
- [x] Minor vs major quest scale affects policy via 035.2
- [x] Unit tests: non-complete update → no context; complete → context with hook

### 035.6 Loot resolution agent + schema (retrieve-first)

#### Description
Dedicated agent call (not the per-turn narration prompt) invoked with `LootContext` + `LootPolicy` + filtered catalog candidates.

**Prompt includes:**
- policy envelope (allowed types, max rarity, max count)
- loot exemplars from 035.3
- retrieve-first instruction: prefer `catalogItemId` from provided candidate list
- realism examples: "wolves → pelts/fangs misc only"

**Output schema:**
```json
{
  "narrationText": "short reward beat",
  "itemGrants": [ {"catalogItemId": "..."} | {"proposeNew": {...}} ],
  "nothingToFind": false
}
```

Rules:
- `itemGrants.length` ≤ `maxGrantCount`
- each grant must satisfy policy; invalid entries dropped server-side (035.7)
- `nothingToFind: true` when scene genuinely has no loot (already picked clean, immaterial foes)
- never propose agent mechanical numbers — 024.3 derives stats

#### Acceptance Criteria
- [x] Agent receives policy + catalog candidates; retrieve-first prompt tested
- [x] Schema validation with retries; empty grants valid when `nothingToFind`
- [x] Scripted test: beast policy → model proposes misc only (reject greatsword in validation layer)
- [x] Separate from `narrate()` — own function e.g. `resolveLoot(provider, context, policy)`

### 035.7 Loot grant validation + persist pipeline

#### Description
Validate and clamp loot agent output before `persistItemGrants` (024):

1. Drop grants with forbidden `itemType` or rarity above `maxRarity` (clamp rarity via `clampItemRarity`, reject if still above cap)
2. Reject `proposeNew` greatsword/`magicItem` when policy forbids
3. Resolve catalog ids through `resolveCatalogItemReference`; unknown ids dropped
4. `canonicalizeProposedItem` for new items — engine templates only
5. `grantItemToCharacter` for each valid grant
6. Return `LootGrantResult`: accepted grants, rejected grants with reasons (for tests/logs)

Filter catalog candidates **before** agent call: `listCatalogItems` filtered by allowed types and rarity ceiling.

#### Acceptance Criteria
- [x] Greatsword proposal under beast policy is rejected, not granted
- [x] Valid misc proposal under beast policy is granted
- [x] Catalog retrieve grant persists to character inventory
- [x] Unit tests cover accept, reject, clamp, and unknown catalog id

### 035.8 Orchestration hooks (encounter end + quest complete)

#### Description
Wire loot pipeline into main turn flow after mechanical resolution:

**Encounter end** (after 031.7 / 034.7):
1. `assembleEncounterLootContext` (035.4)
2. if lootable → `resolveLootPolicy` → `resolveLoot` agent → `validateAndPersistLootGrants`
3. append loot narration to turn result or exposition feed segment
4. document XP hook for epic **036** — loot runs **after** XP/level-up in 036.8

**Quest complete** (in `persistNarrationSideEffects` or `turnIpc` when thread state transitions):
1. same pipeline with 035.5 context
2. do not double-loot if encounter end and quest complete fire same turn — precedence: quest loot only if encounter loot already ran, or merge policies (document in 035.1)

Return `TurnResult` extension: `lootNarration?`, `lootGrants?`.

#### Acceptance Criteria
- [x] Winning a combat encounter can produce inventory items without requiring mid-combat narration grants
- [x] Quest completion transition can produce items in same turn as completion narration
- [x] No duplicate grants when both hooks fire same turn (tested)
- [x] Integration test with scripted loot agent + inventory assertion
- [x] When 036 is implemented, loot pass runs after XP/level-up gate clears (see 036.8)

### 035.9 Loot events + reward narration

#### Description
Append structured events for loot beats:
- `loot_resolved` — source, policy summary, grant item ids, rejected count
- link to `combat_ended` or `quest_completed` event id when available

Surface `narrationText` from loot agent in exposition feed (029 ordering when available; otherwise append after combat end beat).

Ensure character sheet inventory refresh path sees new items (existing 024.10 IPC).

Optional: log book `thing` entry proposal for notable quest rewards (agent or deterministic rule).

#### Acceptance Criteria
- [x] Each loot pass appends `loot_resolved` with machine-readable payload
- [x] Player sees loot narration in play view after encounter/quest
- [x] Inventory IPC reflects new items without restart
- [x] Unit test asserts event shape
