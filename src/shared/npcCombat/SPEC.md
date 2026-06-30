# NPC combat tiers, provoke rules, and defeat disposition

## Combat tier precedence

When resolving combat stats for an NPC, apply the first matching tier:

1. **catalog** — linked `catalog_creature_key` (epic 023 / 031.3); catalog HP/AC/damage take precedence
2. **retired_adventurer** — unlikely upgrade decided once at NPC creation (032.7)
3. **villager** — default for all speaking NPCs without catalog link

Agents pick tier labels only; HP, AC, attack bonus, and damage dice are engine constants.

## Backstory policy

- `backstory` is written once at NPC creation (campaign generation or runtime create path)
- Runtime agents read backstory for grounding; they must not contradict or extend it
- `disposition` (attitude toward the player) should be consistent with backstory when both are generated together

## Retired-adventurer review

- Runs once immediately after a speaking NPC's backstory is persisted — never at combat start
- Default outcome: `upgrade: false` (unlikely)
- `upgrade: true` only when **persisted backstory** already explicitly describes meaningful combat/adventuring experience
- Vague hints ("old scar", "seems tough") → stay villager
- Mundane occupations (farmer, baker, clerk) → always villager
- Profiles: `brawler`, `skirmisher`, `veteran` — each maps to a fixed engine stat block stronger than villager, bounded below a level-5 PC

## Provoke disposition shift

When the player attacks a non-hostile NPC in the current region:

- Target must be alive and present in-region
- `disposition` shifts to hostile (prefix or replace with `hostile — provoked by the player's attack`)
- Combat uses the NPC's already-settled `combat_tier` — no review agent at provoke time

## Defeat disposition

When a **speaking NPC** defeats the player, alignment + persisted backstory drive disposition:

| disposition | typical alignment + backstory |
|-------------|------------------------------|
| `imprison` | lawful-good retired guard captain |
| `bury_out_back` | chaotic-good reformed bandit |
| `leave_unconscious` | non-lethal default / beasts |
| `execute` | lawful-evil or vengeful victor |
| `ransom` | pragmatic captor |
| `mercy_release` | compassionate victor |

### Death-mode interaction

| disposition | Legendary | Standard | Respawn |
|-------------|-----------|----------|---------|
| `imprison` | imprisoned flag; play gated | same | same |
| `bury_out_back` | buried / unconscious at scene | revert to snapshot | respawn per rules |
| `execute` | permanent death | revert to snapshot | respawn per rules |
| `leave_unconscious` | unconscious at scene | revert if dying sequence lost | respawn |
| `ransom` | awaiting_ransom flag | same | same |
| `mercy_release` | released at scene | same | same |

Non-speaking creature victors use deterministic `leave_unconscious` without an agent call.
