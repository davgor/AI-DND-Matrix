# NPC yield smoke test

## Automated

```bash
npm test -- src/db/npcYieldSmoke.test.ts src/engine/yieldEligibility.test.ts src/engine/playerAttack.test.ts src/agents/yieldReview.test.ts src/agents/yieldRules.test.ts
```

## Scenarios

Five scenarios exercise the full yield / non-lethal victory path:

**A – Provoked farmer surrenders at HP threshold**
- Villager NPC drops below 50% HP → yield check required → `surrender` outcome → NPC stays alive, disposition set to subdued, `npc_surrendered` event fired.

**B – Skittish NPC flees**
- Skittish temperament NPC drops to 50% HP → yield check required → `flee` outcome → NPC stays alive, removed from active encounter, `npc_fled_combat` event fired.

**C – Non-lethal attack incapacitates**
- Player attacks with `non_lethal` lethality → NPC reaches 0 HP → `incapacitated: true` → `incapacitated` outcome → NPC stays alive with `encounterOutcome = 'incapacitated'`.

**D – Fanatic fights to slain (control)**
- Aggressive temperament NPC at 25% HP → no yield check (disciplined/aggressive only yield at 0 HP) → player must lethal-finish for `slain`.

**D2 – Engine authority: only `slain` sets `alive: false`**
- Surrendered NPC remains `alive: true`; only explicitly setting `slain` via `setNpcEncounterOutcome` marks death.

## Manual (dev)

1. Start a campaign with a villager-tier NPC (e.g. farmer, civilian guard).
2. Provoke the NPC and enter combat.
3. Deal moderate damage (reduce NPC below half HP) — observe the combat HUD displays a **Surrendered** or **Fled** badge instead of continued combat.
4. Confirm the NPC is still visible in the HUD with their yield badge (not removed as a corpse).
5. Confirm DB row `encounter_outcome = 'surrender'` and `alive = 1` using the browser DevTools → IPC or the app's character sheet.
6. Submit a non-lethal attack phrase ("I knock him out") against a higher-HP NPC — confirm the NPC reaches 0 HP and is marked **Incapacitated** rather than dead.

## Notes

- **Rules-first (040.8):** yield outcomes are decided by a pure decision table (`src/agents/yieldRules.ts`) over `temperament` + `combatTier` + lethality + allowed outcomes, with zero LLM calls for clear-cut cases (cowardly surrender, beast flee, fanatic fight_on, non-lethal incapacitated, villager surrender). The `yieldReview` agent calls the LLM only when the table returns `ambiguous` — a retired-adventurer (veteran) tier NPC with multiple allowed outcomes and no clear-cut temperament. Narration hints come from template strings on the rules path.
- Hard invariants enforced by the table (and clamped onto LLM output): never `slain` when the attack is non-lethal or mercy is offered, never `surrender` for non-speaking creatures, and the outcome is always within the engine's allowed outcomes ∪ `fight_on`. A property-style test in `src/agents/yieldRules.test.ts` enumerates the full input space.
- `fight_on` is a transient agent outcome that never persists; the NPC stays in the encounter initiative order.
- Only `slain` sets `alive: false`; the engine is authoritative for this flag.
- The HUD `YieldBadge` shows surrender/fled/incapacitated badges; slain NPCs are omitted (they were never added with encounterOutcome).
