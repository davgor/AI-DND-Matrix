# EPIC: XP awards and agentic level-up perks

Wire progression into encounter and quest completion — the mirror of epic **035** for loot. Today `awardXP` exists in `/engine/xp.ts` and characters persist `xp` / `level`, but **nothing awards XP** when combat ends or a quest completes. Level-ups have no UI, no narration beat, and no perk selection.

After this epic:

1. **XP awards** — at encounter end and quest completion, an agent proposes an XP amount grounded in what happened. The **engine** clamps the proposal to a band derived from encounter difficulty (foe tiers, count, outcome) and the player's **current level**, then calls `awardXP`.
2. **Level-up flow** — when a threshold is crossed, pause play for a level-up ceremony: DM narration + **three perk options** generated from what the character actually did since the last level (events, log book, journal, combat vs study tags).
3. **Perk application** — the player **chooses one** of the three options. The agent supplies flavor and a perk **category**; the engine applies mechanical numbers (AC +1, spell catalog grant, extra attack flag, etc.) via fixed templates — same guardrail pattern as 024.3 / 004.23 / homebrew flavor.

Examples the spec must support:
- Level 1 fighter who spent the level studying spells at a library → perk options lean arcane (catalog spell access, arcane-tagged ability)
- Level 1 fighter who leveled through combat → perk options lean martial (AC bump, extra attack, weapon proficiency flavor)

Builds on **035** hook points (same encounter-end / quest-complete triggers). Run **XP award before loot** in orchestration (document in 036.8). Integrates **004.22** emergent-direction signals into level-span activity context.

Broken down into sub-tickets 036.1–036.12. This epic is done when all of them are.

Definition of done:
- shared types document XP sources, clamp bands, perk categories, and level-up ceremony flow
- engine computes min/max XP from difficulty + player level; agent cannot exceed band
- encounter end and quest completion each trigger XP resolution
- crossing a level threshold opens level-up UI with narration and exactly 3 perk proposals
- perk proposals reflect level-span activity; player selects 1; engine persists mechanical effect
- multiple thresholds in one award queue sequential level-up picks (one ceremony per level gained)
- smoke test: encounter XP → combat-themed perks; quest XP → level-up; library-tagged activity → spell-leaning perk option

036.1 XP + level-up spec + shared types · 036.2 engine XP budget resolver (difficulty × player level) · 036.3 XP context assembly (encounter + quest) · 036.4 XP award agent + schema · 036.5 level-span activity context for perks · 036.6 engine perk templates + mechanical application · 036.7 level-up perk agent (3 options) + schema · 036.8 orchestration hooks (XP → level-up → loot order) · 036.9 perk persistence + character sheet display · 036.10 level-up modal UI (narration + pick 1 of 3) · 036.11 XP/level-up events + narration feed · 036.12 end-to-end progression smoke test
