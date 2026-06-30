# EPIC: NPC surrender, non-lethal victory, and yield outcomes

Epic 032 gave rich nuance when an **NPC defeats the player** (imprison, bury, ransom, mercy). Epic 031.6 currently ends player victories with defeated NPCs **marked dead** — the only outcome. A provoked villager farmer (032.6) who was never going to fight to the death has no surrender, flee, or mercy path once losing. That tonal asymmetry breaks the care put into the reverse case.

This epic adds **yield outcomes** when the **player is winning**:

1. **Non-lethal intent** — the player can attack to incapacitate, not kill. Engine caps or routes damage so 0 HP means unconscious/alive unless the player explicitly follows through lethally afterward.
2. **NPC yield review** — when an NPC drops below a yield threshold or reaches 0 HP, an agent reads **persisted backstory**, temperament, alignment, and combat tier (032) and proposes `surrender`, `flee`, `fight_on`, or `incapacitated` — not automatic death. Cowardly, skittish, or civilian NPCs should yield often; fanatics and mindless beasts may not.
3. **Encounter resolution** — replace 031.6's blanket `status.alive = false` with outcome-specific persistence: surrendered (alive, hostile → subdued), fled (removed from encounter, may return in fiction), incapacitated (0 HP, alive), or slain (lethal confirm).

Engine owns HP, alive/dead flags, and encounter membership; agents propose yield flavor and narration only. Yield review uses **stored backstory only** (032 policy) — no invented biography.

Complements **031** (combat loop), **032** (NPC identity), and **033** (player flee). 033 covers the player escaping; this epic covers **hostiles breaking off or yielding** when losing.

Broken down into sub-tickets 034.1–034.10. This epic is done when all of them are.

Definition of done:
- shared types document non-lethal intent, yield triggers, and NPC yield outcome enum
- engine supports non-lethal damage (incapacitation at 0 HP without death) and deterministic yield-threshold eligibility
- DM intent classifies non-lethal attacks and player acceptance of surrender
- yield review at threshold/0 HP reads persisted backstory; cowardly/civilian NPCs usually yield; fight-to-death is the exception
- encounter end applies yield outcome instead of always marking NPCs dead
- disposition and narration reflect surrender/flee/incapacitation
- UI distinguishes slain vs surrendered vs fled vs incapacitated combatants
- smoke test: provoked farmer surrenders, skittish NPC flees, non-lethal spare leaves NPC alive

034.1 yield + non-lethal spec + shared types · 034.2 engine non-lethal damage and incapacitation · 034.3 engine yield-threshold eligibility (temperament/tier) · 034.4 DM intent non-lethal + accept-surrender classification · 034.5 NPC yield review agent (stored backstory only) · 034.6 encounter end + NPC outcome persistence (replace always-dead) · 034.7 turnIpc yield branch on player attacks · 034.8 post-yield narration + disposition updates · 034.9 UI yield outcome indicators · 034.10 end-to-end smoke test

## Sub-tickets

### 034.1 Yield + non-lethal spec + shared types

#### Description
Document player-winning combat outcomes and add shared types under `/shared`.

Cover:
- **`AttackLethality`**: `lethal` (default) | `non_lethal` — player intent per attack or per-encounter toggle (document chosen v1 UX in spec)
- **`NpcYieldOutcome`**: `surrender` | `flee` | `incapacitated` | `slain` | `fight_on` (transient — no persistence, combat continues)
- **yield triggers**: HP at or below tier-based threshold (e.g. 25% max HP for villager), OR HP reaches 0, OR player explicitly offers mercy / accepts surrender in input
- **eligibility for yield check**: engine pre-filter from temperament (`skittish`, `cautious` → likely; `aggressive`, `mindless` → unlikely); `villager` tier more willing than `retired_adventurer`; beasts with `canSpeak: false` may only `flee` or `incapacitated`, not dialogue surrender
- **non-lethal at 0 HP**: HP floor 0, `alive: true`, condition `unconscious` — not `slain` unless player confirms coup de grâce (optional v1: auto-spare on non-lethal, no extra confirm)
- **symmetry with 032**: player-winning outcomes are narratively rich but simpler mechanically than `DefeatDisposition`; surrender ≠ imprison
- **031.6 amendment**: encounter end must branch on `NpcYieldOutcome`, not always `status.alive = false`
- **033 boundary**: NPC `flee` removes them from **this encounter**; player `flee` (033) is a separate disengage path

#### Acceptance Criteria
- [x] Spec documents all yield outcomes with examples (provoked farmer → surrender; skittish bandit → flee; fanatic cultist → fight_on until slain)
- [x] Shared types export `AttackLethality`, `NpcYieldOutcome`, `YieldReviewInput`, `YieldReviewResult`
- [x] Spec states yield review reads persisted backstory only (032 policy)
- [x] Unit tests validate outcome enum parsing and lethality flag guards

### 034.2 Engine non-lethal damage and incapacitation

#### Description
Extend `/engine` player attack resolution (031.5) with a `lethality` parameter.

**Non-lethal:**
- damage still applies normally until HP would drop below 0
- at 0 HP: target is `incapacitated` (unconscious), `alive: true`, not `slain`
- optional engine flag `canBeFinishedOff` for later lethal confirm (document if v1 skips this)

**Lethal:**
- at 0 HP: triggers yield review (034.5) before marking `slain`; if NPC already surrendered earlier, may remain alive per outcome

Return extended result: `lethality`, `incapacitated`, `hpAfter`, `wouldKill` (boolean — damage reached 0).

Pure engine — no DB imports.

#### Acceptance Criteria
- [x] Non-lethal attack at 0 HP yields `incapacitated: true`, not `slain`
- [x] Lethal attack at 0 HP yields `wouldKill: true` for yield review gate
- [x] Unit tests compare lethal vs non-lethal on same damage roll
- [x] Crit rules unchanged; non-lethal crit still incapacitates, does not auto-slay

### 034.3 Engine yield-threshold eligibility (temperament / tier)

#### Description
Pure `/engine` function: given NPC combat tier, temperament, HP ratio, and whether damage this turn crossed the threshold, return whether a **yield review** must run.

Deterministic rules (document exact table in 034.1):
- `villager` + HP ≤ 50% → always eligible
- `skittish` / `cautious` → eligible at 50% or on any hit that brings HP ≤ 25%
- `aggressive` / `disciplined` → eligible only at 0 HP (or never before 0 for `mindless`)
- `retired_adventurer` → eligible at 25% and 0%
- catalog beasts / `mindless` → flee or fight_on only; no dialogue surrender

Engine returns `YieldCheckRequired: boolean` + `suggestedOutcomes: NpcYieldOutcome[]` as **hints** to the agent (agent may pick only from allowed set).

#### Acceptance Criteria
- [x] Threshold logic is deterministic and unit-tested per temperament × tier matrix
- [x] Farmer/villager fixture triggers yield check before 0 HP on moderate damage
- [x] Mindless beast never offers `surrender` in allowed outcomes list
- [x] No LLM or DB imports in engine module

### 034.4 DM intent non-lethal + accept-surrender classification

#### Description
Extend DM combat intent (031.4) to classify:

- **`lethality`**: `non_lethal` when player input clearly aims to subdue, knock out, disarm, or "not kill" — default `lethal` when ambiguous
- **`acceptSurrender`**: `true` when player input accepts yield ("I lower my weapon", "stay down", "I won't hurt you if you surrender") — may pair with held action
- **`offerMercy`**: optional flag when player offers terms before NPC is at 0 HP

Schema addition to combat intent JSON (validated, retried). Prompt includes active encounter, target NPC HP band, and whether NPC has already yielded this encounter.

#### Acceptance Criteria
- [x] "I punch him to knock him out" → `non_lethal`; "I run him through" → `lethal`
- [x] "Okay, stay down — I won't kill you" → `acceptSurrender: true`
- [x] Invalid lethality values rejected with retry
- [x] Unit tests with scripted provider fixtures

### 034.5 NPC yield review agent (stored backstory only)

#### Description
When 034.3 says a yield check is required (or player used non-lethal at 0 HP, or player `acceptSurrender`), call a yield review agent **before** marking the NPC dead.

**Input (read-only):** persisted `backstory`, `temperament`, `alignment`, `disposition`, `combat_tier`, current HP ratio, `AttackLethality`, engine `suggestedOutcomes` allow-list.

**Output schema:**
```json
{
  "outcome": "surrender"|"flee"|"incapacitated"|"fight_on"|"slain",
  "narrationHint": "short prose seed for DM narration"
}
```

**Prompt rules:**
- must pick from engine allow-list; if only one allowed, return it
- cowardly / civilian backstories → prefer `surrender` or `flee` over `fight_on`
- provoked farmer who never wanted this fight → `surrender` at threshold, not `slain`
- `fight_on` only when backstory/temperament supports dying before yielding (fanatic, mindless beast, cornered villain)
- non-lethal player intent + `acceptSurrender` → never return `slain`
- do not invent new backstory; cite temperament and stored backstory only

If agent fails schema, engine default: `incapacitated` when non-lethal, `surrender` for villager tier, else `incapacitated`.

#### Acceptance Criteria
- [x] Mundane farmer backstory at 40% HP yields `surrender` or `flee` in tests
- [x] Aggressive fanatic backstory may return `fight_on` until 0 HP
- [x] Non-lethal + 0 HP never returns `slain`
- [x] Output constrained to engine allow-list
- [x] Review input is DB backstory only

### 034.6 Encounter end + NPC outcome persistence (replace always-dead)

#### Description
Amend encounter resolution (031.6) and NPC repositories to persist **yield outcomes** instead of always setting `status.alive = false` on defeat.

Per `NpcYieldOutcome`:
- **`surrender`**: `alive: true`, HP may be > 0 or 0; disposition → subdued/hostile-captured; remove from active encounter; optional `surrendered: true` flag on NPC status JSON
- **`flee`**: `alive: true`; remove from encounter initiative; disposition may stay hostile; append fled event (NPC may be re-encountered later)
- **`incapacitated`**: `alive: true`, HP 0, condition `unconscious`; out of encounter until stabilized
- **`slain`**: `alive: false` — only outcome that marks death (current 031.6 behavior)

Encounter ends when no hostile combatants remain **in the fight** (surrendered/fled/incapacitated count as removed). Append `combat_ended` with outcome summary per NPC.

Update `deleteCampaign` / event payloads if needed.

#### Acceptance Criteria
- [x] Surrendered NPC remains `alive: true` in DB after player victory
- [x] Fled NPC removed from active encounter but not marked dead
- [x] Only `slain` sets `alive: false`
- [x] 031.6 acceptance criteria amended: defeated ≠ always dead
- [x] Unit tests cover all four persisted outcomes

### 034.7 turnIpc yield branch on player attacks

#### Description
Wire yield flow into the player attack path (031.7):

1. Resolve attack with lethality from 034.4 (034.2 engine)
2. If 034.3 requires yield check OR `wouldKill` / incapacitation → call 034.5 before persisting death
3. Apply 034.6 outcome to NPC row and encounter state
4. If `fight_on`, continue encounter without removing NPC
5. If player `acceptSurrender` on already-yielding NPC, skip further attacks and resolve surrender outcome

Short-circuit: non-lethal incapacitation may skip agent when engine allow-list is only `incapacitated`.

Return `TurnResult` extensions: `npcYieldOutcome?`, `targetNpcId?`, `attackLethality?` for renderer.

#### Acceptance Criteria
- [x] Player lethal attack on yielding farmer does not mark dead without `slain` outcome
- [x] Player non-lethal attack leaves NPC alive at 0 HP
- [x] `fight_on` NPC remains in initiative order
- [x] Integration tests with scripted yield agent responses

### 034.8 Post-yield narration + disposition updates

#### Description
After yield outcome is persisted, DM narrates the beat using engine facts + `narrationHint` from yield review. Update NPC `disposition` for surrender (e.g. subdued, terrified, grudging respect) — engine or repository update, not free-form agent write to stats.

Append events: `npc_surrendered`, `npc_fled_combat`, `npc_incapacitated`, `npc_slain` with payload including lethality and HP.

Ground narration context so later turns remember surrendered NPCs are alive on the ground, not corpses.

#### Acceptance Criteria
- [x] Surrender produces DM narration and disposition shift toward subdued
- [x] Flee produces narration describing escape from the scene
- [x] Events distinguish surrender/flee/incapacitate/slain types
- [x] Subsequent DM context lists living surrendered NPCs correctly

### 034.9 UI yield outcome indicators

#### Description
Surface yield state in play view and combat HUD (031.9):

- combatant list shows **surrendered**, **fled**, **incapacitated** badges — not only HP/dead
- exposition feed renders yield beats (farmer pleading, bandit running) distinct from kill blows
- optional non-lethal toggle or indicator in player action panel (if v1 UX chooses per-attack toggle, show active mode)

Campaign review: NPCs alive after surrender show subdued disposition + not dead.

#### Acceptance Criteria
- [x] HUD distinguishes incapacitated vs slain combatants
- [x] Surrender event visible in exposition feed
- [x] Non-lethal mode visible to player when active (per spec UX choice)
- [x] No corpse UI for surrendered-alive NPCs

### 034.10 End-to-end smoke test (surrender, flee, non-lethal spare)

#### Description
Validate player-winning yield paths with create-time backstory fixtures (032 policy).

**Scenario A — provoked farmer surrenders:**
1. Villager farmer NPC with mundane backstory; player provokes (032.6) and fights
2. Farmer drops below yield threshold → `surrender`; remains alive after player victory

**Scenario B — skittish NPC flees:**
1. NPC with skittish temperament + cowardly backstory
2. Loses HP → `flee`; removed from encounter, still alive in DB

**Scenario C — non-lethal spare:**
1. Player attacks with non-lethal intent
2. NPC at 0 HP → `incapacitated`, `alive: true`

**Scenario D — lethal confirm (control):**
1. Fanatic/villain NPC fights to `slain` only when backstory supports `fight_on` through 0 HP on lethal attacks

Deliver: `src/db/npcYieldSmoke.test.ts`, `docs/runbooks/npc-yield-smoke-test.md`

#### Acceptance Criteria
- [x] Automated tests cover A–C minimum
- [x] Farmer scenario proves 031.6 no longer always-dead
- [x] Engine remains authoritative for HP and alive flags
- [x] Runbook documents manual dev verification
- [x] `npm test`, `npm run lint`, `npm run build` pass
