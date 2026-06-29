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
