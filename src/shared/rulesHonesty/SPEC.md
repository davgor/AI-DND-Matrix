# Rules honesty — conditions + emergent homebrew

Contract for epic **131**. Mechanical README claims for conditions and emergent homebrew must match engine behavior. Sibling **126** owns turn lockout; this SPEC does not reopen it.

Canonical table: `CONDITION_EFFECTS` in `src/engine/conditions.ts`.

## Conditions → mechanical effects

| Condition | `CONDITION_EFFECTS` | Applied at |
|-----------|---------------------|------------|
| **Prone** | Disadvantage on Agility checks/attacks/saves | Ability checks (`resolveCheck` via mode), attack rolls (treated as Agility), Agility saves, flee disengage (player side) |
| **Restrained** | Disadvantage on Agility (same as prone) | Same Agility sites as prone |
| **Poisoned** | Disadvantage on **all** ability checks/attacks/saves | All check/attack/save rolls that pass conditions into the helpers |
| **Stunned** | `preventsActions` + auto-fail Body/Agility saves | `canAct` gates Actions; `resolveSave` auto-fails body/agility when conditions include stunned |
| **Unconscious** | Same as stunned | Same; combat HUD / sheet show the condition when present on `stats.conditions` / NPC `conditions` |

### Helpers (engine-owned)

| Function | Behavior |
|----------|----------|
| `canAct(conditions)` | Authoritative for `preventsActions` (stunned / unconscious). |
| `hasDisadvantageOn(conditions, ability)` | True when any active effect has `disadvantageOnAll` or lists that ability. |
| `autoFailsSave(conditions, ability)` | True when any active effect lists the ability in `autoFailSaves`. |
| `advantageModeFromConditions(conditions, ability)` | `'disadvantage'` or `'none'` (conditions never grant advantage in v1). |
| `attackAdvantageMode(conditions)` | Attack rolls use the Agility disadvantage rule (weapon attacks are Agility-based). |
| `parseConditions` / `conditionsFromStats` | Validate/normalize stored condition lists. |

### Resolution call sites

| Site | How conditions apply |
|------|----------------------|
| `resolvePlayerAttackAgainstNpc` / `resolveNpcAttack` | Optional `attackerConditions` → `rollD20WithMode(..., attackAdvantageMode(...))` |
| `combatResolvers.resolvePlayerAttack` / NPC catch-up | Passes player `stats.conditions` / NPC `conditions` |
| `npcProvoke.strikeProvokedNpc` | Passes player conditions |
| `turnIpc.resolveOutcome` | Ability checks use `advantageModeFromConditions` for the intent ability |
| `resolveSave` | Optional `conditions`: auto-fail first, else disadvantage mode |
| `resolveFleeDisengage` | Optional player/hostile condition lists → Agility disadvantage on each side |
| `combatTurn.playerCanTakeCombatAction` | Existing `canAct` gate (unchanged authority) |
| Combat HUD `combatSnapshot` | Player conditions from `stats.conditions` (same list mechanics use) |

### Dying saves exception

`progressDyingSequence` uses a dedicated Body-save protocol while the character is dying. It does **not** pass condition lists into `resolveSave`, so `unconscious.autoFailSaves` does not short-circuit stabilization. Being unconscious is why the dying sequence exists; auto-fail would make recovery impossible.

## Emergent homebrew — shipped loop

| Step | Owner | Behavior |
|------|-------|----------|
| 1. Detect | `detectEmergentDirection` | Counts tagged events outside archetype `kitTags`; returns `{ tag, count }` at threshold (≥ 3). |
| 2. Surface | `buildLevelSpanContext` → `LevelSpanContext.emergentDirection` | Included in the level-up perk prompt (`buildLevelUpPrompt`). |
| 3. Offer | `resolveLevelUpPerks` | Level-up agent may propose `custom_feature` / `passive_feature` flavored by the direction. On LLM/schema failure, **engine fallback** still returns three perks; when `emergentDirection` is set, fallback includes a `custom_feature` tagged with that direction. |
| 4. Persist | `applyPerk` → `computeFeatureFromTemplate` | Engine clamps mechanical numbers; agent supplies name/description/flavor only. |

There is **no** separate `proposeHomebrewFlavor` DM agent. Flavor rides on the level-up perk proposals (or fallback names). LLM failure never blocks level-up numbers or the ceremony completing.

## Non-goals (v1)

- New condition enum values beyond the five above
- Turn lockout (**126**)
- Spell slots / mana
- Full homebrew workshop / player-authored mechanics outside templates
- Applying auto-fail to dying saves
- Reintroducing a dedicated homebrew-flavor agent
