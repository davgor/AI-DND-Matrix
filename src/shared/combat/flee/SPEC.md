# Combat flee resolution

Fleeing is a two-layer model: the engine resolves a deterministic disengage check; the DM agent may only narrate full escape on top of a successful check.

## Disengage check

When the player submits free text classified as `combatIntent: flee` on their own turn during an active encounter:

1. Select the **most threatening engaged hostile** — the hostile NPC still in the fight (HP > 0, no yield outcome) with the **highest attack bonus**. Ties break by stable NPC id ascending.
2. Roll an **opposed Agility contest** (flat contested roll, no crit rules):
   - Player: `d20 + Agility modifier + proficiency bonus` when the DM marked the flee as a proficient Agility action (default proficient for flee in v1).
   - Hostile: `d20 + Agility modifier` (default modifier +0 when ability scores are unknown).
3. **Ties go to the defender** (the hostile). Success requires `playerTotal > hostileTotal`.

The engine return value is authoritative — no caller or agent may override success/failure.

## Encounter pursuit sub-state

Stored on the active encounter row alongside initiative:

| Sub-state | Meaning |
|-----------|---------|
| `engaged` | Normal combat; no successful disengage this round cycle. |
| `pursued` | Player won the disengage check but the DM has not yet judged full clearance. |

Transient `disengage_attempted` exists only in-memory for the duration of a single turn resolution.

Flow:

```
engaged --[flee fail]--> engaged (action consumed, turn advances)
engaged --[flee success]--> pursued --[DM still_pursued]--> pursued (encounter stays active)
pursued --[DM escaped]--> player marked exited; encounter may stay active for remaining combatants
pursued --[flee fail on retry]--> engaged
```

The player is added to `exitedCombatantIds` only after a DM-judged `escaped` outcome. Partial success (`pursued`) does **not** remove the player from turn order until full escape.

## DM judgment boundary

After an engine-successful disengage check, the DM escape-narration call receives the roll result and scene context. Output:

```json
{ "outcome": "still_pursued" | "escaped", "narrationText": "..." }
```

- On engine **failure**, the escape-narration agent is **not** called.
- Server-side validation rejects `escaped` when the input check failed (defense in depth).
- The DM may choose `still_pursued` or `escaped` only when the check succeeded; it cannot upgrade a failed check.

## Repeat attempts

Failed flee consumes the player's Action and advances initiative normally. The player may attempt again on their next turn with no stacking penalty.

## Party members (v1)

Flee is player-only. AI party members do not automatically flee when the player does. After a full player escape, party members still in the encounter keep resolving their combat turns until the encounter ends on existing terms (all hostiles defeated, etc.). The player immediately returns to free exploration in the current region.

## Interaction with defeat disposition (epic 032)

A fleeing player who fails and is later defeated routes through defeat-disposition normally — flee does not bypass that path.
