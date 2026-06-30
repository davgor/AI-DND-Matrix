# Combat encounter mode

Structured encounter mode wires initiative, turn order, and engine-authoritative attack resolution into the play loop. Agents narrate outcomes; they never decide hit/miss or damage.

## Encounter lifecycle

| Phase | Meaning |
|-------|---------|
| `idle` | No active encounter (no `active` row in DB). |
| `active` | Initiative rolled; turn order enforced. |
| `resolved` | Encounter ended with outcome `defeated`, `fled`, or `retreated`. |

**Start triggers:** DM intent `startEncounter` when no encounter is active. Participants default to hostile NPCs in the current region with HP > 0; optional `participantNpcIds` overrides.

**End conditions:** all hostile combatants removed from the fight (defeated/slain, fled, surrendered, incapacitated), DM intent `endEncounter`, or player `flee`.

## Combatant identity

Each combatant is a `CombatantRef`: `{ kind: 'player' | 'ai_party_member' | 'npc', id: string }`.

- **Player** — the player character id.
- **AI party member** — `ai_party_member` character rows flagged in-scene.
- **NPC** — hostile (or explicitly listed) NPC ids.

## Initiative and turns

- Initiative is rolled **once** at encounter start: `d20 + Agility modifier` per combatant, highest first. Ties keep stable order by id.
- `activeTurnIndex` points into `initiativeOrder`; `round` increments when the index wraps.
- Combatants at 0 HP who are out of the fight (slain, fled, surrendered, incapacitated) are **skipped** automatically.
- **Max catch-up:** when advancing past the player slot, at most `MAX_COMBAT_CATCHUP_TURNS` (10) non-player turns run per player submission to prevent infinite loops.

## Action economy

One **Action** per turn (reuse engine `TurnState`). Movement is narrative-only in v1.

On the player's combat turn:
- `combatIntent: attack` resolves mechanically and consumes the Action.
- Other input may still run interpret/narrate routing, but a committed combat action consumes the Action when the spec marks it as such.

Off-turn player submissions are rejected with a clear error; encounter state is not mutated.

## Engine authority

HP, AC, conditions, attack rolls, damage, crits, and death at 0 HP are engine-owned. NPC/player combat stats live on persisted rows. Agents receive post-resolution facts for narration only.

During an **active** encounter, ad-hoc NPC `reaction.attack` must not apply damage — mechanical damage flows only through combat turns (see turnIpc combat branch).

## Coexistence with exploration routing

Epic 029 turn routing still applies to narration beats after mechanical resolution. Combat beats can attach as ordered exposition segments via `TurnResult.combatAttack` and `combatState` without rewriting encounter state.

## Yield outcomes (epic 034 hook)

When an encounter ends, per-NPC outcomes may be `surrender`, `flee`, `incapacitated`, or `slain`. Only `slain` sets `status.alive = false`. Until epic 034 is fully wired, hostiles reduced to 0 HP default to `slain`.
