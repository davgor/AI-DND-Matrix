# EPIC: Combat encounter mode (engine → turn loop → UI)

Wire the existing combat engine primitives into a real **encounter mode** that players can see and play through. Today initiative (`rollInitiative`), action economy (`useAction`), conditions, player weapon damage, and NPC-to-player attacks exist in isolation — but there is no persisted encounter state, NPCs have no HP/AC on the `npcs` row (attacks use hardcoded `+2` / `1d6`), the player cannot mechanically attack an NPC, and combat is triggered only as an ad-hoc `attack: true` flag on an NPC reaction outside initiative order.

After this epic, hostile scenes transition into a structured encounter: initiative is rolled once, turn order is enforced, the engine resolves attack rolls and damage authoritatively (player ↔ NPC, with equipped weapons and catalog creature stats where available), defeated NPCs are marked dead, and the play view shows who acts when with HP/condition visibility. Agents narrate outcomes; they never decide hit/miss or damage.

Epic 029 (turn routing) improves how combat beats are *presented* in the exposition feed; this epic owns the *mechanical* combat loop underneath. Implement 031 so routing hooks can attach later without rewriting encounter state.

Broken down into sub-tickets 031.1–031.11. This epic is done when all of them are.

Definition of done:
- shared types document encounter lifecycle, combatant identity, initiative order, and action-economy rules
- active encounter state and per-NPC combat stats persist in SQLite and survive restart
- catalog creature stats hydrate NPC combatants when retrieval supplies a canonical entry (epic 023)
- DM intent distinguishes combat start, player attack against a target, and encounter end
- `turnIpc` runs a combat branch: initiative at start, one action per turn, automatic NPC/party turns when not the player's slot
- player attacks resolve against NPC AC with equipped weapon damage; NPC attacks use persisted stats, not constants
- play view shows initiative order, active combatant, and HP/condition chips for visible combatants
- combat events append to the campaign event log for narration grounding
- smoke test resolves a full encounter (initiative, at least one hit and one miss, HP changes, encounter end)

031.1 combat encounter spec + shared types · 031.2 DB schema + repositories (encounter state + NPC combat stats) · 031.3 NPC combat stat hydration from catalog · 031.4 DM combat intent schema (start / attack / end) · 031.5 engine player attack resolution vs NPCs · 031.6 initiative + encounter lifecycle orchestration · 031.7 turnIpc combat branch + turn-order enforcement · 031.8 NPC and party combatant turn resolution · 031.9 combat state IPC + play-view HUD · 031.10 combat events + DM narration grounding · 031.11 end-to-end combat encounter smoke test

## Sub-tickets

### 031.1 Combat encounter spec + shared types


#### Description
Document the encounter lifecycle and add shared types under `/shared` for combat state consumed by engine, DB, agents, `turnIpc`, and the renderer.

Cover:
- encounter phases: `idle` → `active` → `resolved` (with `fled` / `defeated` / `retreated` outcome)
- combatant kinds: `player`, `ai_party_member`, `npc` — each referenced by stable id
- initiative order (rolled once at encounter start, fixed for the encounter)
- active turn index and round counter
- action economy: one Action per turn (reuse `TurnState` from `/engine/combat`); movement is narrative-only for v1
- how engine resolution stays authoritative for attacks, damage, conditions, and death at 0 HP
- how agents receive post-resolution facts for narration only
- coexistence with the ad-hoc NPC `attack` reaction path: during an active encounter, attacks must flow through the combat branch (ticket 031.7)
- hook points for epic 029 turn routing (combat beats as ordered exposition segments)

#### Acceptance Criteria
- [x] Spec describes encounter start triggers, participant inclusion rules, and end conditions (all hostiles defeated, encounter ended by DM intent, or player flee)
- [x] Shared types export `CombatEncounter`, `CombatantRef`, `InitiativeEntry`, `EncounterPhase`, and `CombatAttackResult` (or equivalent) usable across layers
- [x] Spec states NPC/player HP and conditions are engine-owned; agents never emit hit/miss or damage numbers
- [x] Unit tests cover type guards / validation helpers for encounter-state JSON and combatant ref normalization

### 031.2 DB schema + repositories (encounter state + NPC combat stats)


#### Description
Add persisted combat state for a campaign and mechanical combat fields on NPCs. Today `npcs.status` only tracks `{ alive, location? }` and there is no encounter table — combat cannot survive restart or enforce turn order.

Add:
- `combat_encounters` (or equivalent campaign-scoped active encounter row): phase, initiative order JSON, active turn index, round, participant ids, started/ended timestamps
- NPC columns (or structured `status` extension): `hp`, `max_hp`, `ac`, `conditions` JSON, optional `catalog_creature_key` for traceability
- repository functions: get/create/update active encounter, end encounter, get/set NPC combat stats, apply damage to NPC, mark NPC dead at 0 HP
- cascade cleanup when a campaign is deleted (extend `deleteCampaign` if needed)
- forward-only migration with sensible defaults for existing NPC rows (derive placeholder AC/HP from role or use safe defaults until hydration in 031.3)

#### Acceptance Criteria
- [x] Schema migration adds encounter storage and NPC combat stat columns without breaking existing NPC reads
- [x] At most one `active` encounter per campaign is enforced at the repository layer
- [x] Repository round-trips initiative order, turn index, and NPC hp/ac/conditions
- [x] `deleteCampaign` removes encounter rows for the campaign
- [x] Unit tests cover migration defaults, encounter lifecycle CRUD, and NPC damage/death updates

### 031.3 NPC combat stat hydration from catalog


#### Description
When an enemy NPC is introduced using the retrieve-first catalog path (epic 023 `decideCreatureSource`), copy canonical combat stats onto the NPC row: `hp`, `max_hp`, `ac`, resistances profile reference, `catalog_creature_key`, and default `temperament` / `canSpeak` if not already set.

For NPCs created without a catalog match, use the **villager** stat block from epic 032 at creation time; catalog creatures and rare **retired adventurer** upgrades (032.6) override that default when applicable. Legacy explicit hostile roles may still use catalog hydration when retrieval matches — agents do not invent HP/AC numbers.

Expose a single hydration entry point callable from campaign generation and from encounter-start logic when stats are still unset.

#### Acceptance Criteria
- [x] Hydrating from a `CatalogCreature` sets hp, max_hp, ac, and `catalog_creature_key` to catalog values
- [x] Fallback template assigns deterministic hp/ac when no catalog entry is linked
- [x] Hydration is idempotent: re-running on an NPC with combat stats does not reset mid-encounter HP
- [x] Unit tests cover catalog hit, fallback, and idempotent skip paths

### 031.4 DM combat intent schema (start / attack / end)


#### Description
Extend DM intent interpretation (or add a dedicated combat-intent call used when an encounter is active or imminent) so the app knows when to enter encounter mode and what mechanical action the player is attempting.

New intent fields (validated JSON schema):
- `combatIntent`: `none` | `startEncounter` | `attack` | `endEncounter` | `flee`
- `targetNpcId` when `combatIntent` is `attack`
- `participantNpcIds` when starting an encounter (defaults to hostile NPCs in the current region when omitted)
- preserve existing `checkNeeded` / rest / travel fields for out-of-combat turns

Prompt/context must include: whether an encounter is already active, visible combatants with HP summaries, whose turn it is, and that attack outcomes are resolved by the engine after intent is parsed.

#### Acceptance Criteria
- [x] Schema validates combat intent shapes; invalid combinations retry up to `MAX_SCHEMA_ATTEMPTS` like existing DM calls
- [x] `startEncounter` is only accepted when no active encounter exists; `attack` requires an active encounter and a valid `targetNpcId`
- [x] Intent prompt includes active encounter snapshot when combat is ongoing
- [x] Unit tests cover happy paths and rejection of attack-without-target / double-start

### 031.5 Engine player attack resolution vs NPCs


#### Description
Implement deterministic player → NPC attack resolution in `/engine` (no DB imports): attack roll (`d20 + modifier` vs target AC), miss on below AC, crit on natural 20 per epic 004.9, damage from equipped weapon profile (passed in as `DamageRoll`), and resistance/vulnerability from the target's profile when present.

Return a structured result: `hit`, `crit`, `attackRoll`, `total`, `damage`, `targetHpAfter`, `targetDefeated`. Caller (`turnIpc`) persists HP changes.

Replace the need for agents to imply combat outcomes in narration JSON.

#### Acceptance Criteria
- [x] `resolvePlayerAttackAgainstNpc` (or equivalent) is pure engine code with unit tests for hit, miss, crit, and resistance halving/doubling
- [x] Attack uses agility-based modifier + proficiency when proficient (parameters, not DB lookups inside engine)
- [x] Natural 1 is a miss regardless of total (document and test)
- [x] Defeated is derived when damage reduces HP to 0 or below

### 031.6 Initiative + encounter lifecycle orchestration


#### Description
Implement encounter start/end orchestration in the main process using `/engine/combat.rollInitiative` and the repositories from 031.2.

On `startEncounter`:
- collect combatants (player, AI party members flagged in-scene, listed hostile NPCs with hp > 0)
- hydrate missing NPC stats (031.3) before rolling
- roll initiative once, persist order and set active turn to the highest roll
- append `combat_started` event

On each turn advance:
- increment turn index; wrap to next round when the order cycles
- skip defeated combatants automatically

On encounter end:
- mark phase `resolved` with outcome, clear active encounter pointer, append `combat_ended` event
- apply per-NPC yield outcome per epic **034** (`surrender` / `flee` / `incapacitated` / `slain`) — do **not** blanket-mark all defeated NPCs dead; only `slain` sets `status.alive = false`
- emit payload sufficient for epic **035** encounter-end loot context (foe outcomes, catalog bucket, lootable bodies)

#### Acceptance Criteria
- [x] Starting an encounter persists initiative order and round/turn index
- [x] `rollInitiative` is invoked exactly once per encounter start
- [x] Turn advancement skips combatants at 0 HP who are out of the fight (slain, fled, surrendered, incapacitated per 034)
- [x] Ending an encounter prevents further combat-intent processing until a new start
- [x] Unit tests cover start, multi-round advance, skip-defeated, and end

### 031.7 turnIpc combat branch + turn-order enforcement


#### Description
Refactor `turnIpc` so when a campaign has an active encounter the combat branch runs instead of the exploration default.

Behavior:
- reject player combat actions when it is not the player's turn (clear IPC error surfaced to renderer)
- on player turn with `combatIntent: attack`, resolve via 031.5, persist NPC HP, advance turn
- on player turn with non-attack input, still allow interpret/narrate but consume the Action if it is a committed combat action (document chosen rule in 031.1 and apply consistently)
- when advancing lands on an NPC or party-member slot, delegate to 031.8 before returning
- disable ad-hoc `reaction.attack` damage during active encounters (reactions may still flavor text; mechanical damage only through combat turns)
- auto-end encounter when all hostile NPC combatants are defeated

Integrate with dying-sequence short-circuit: unconscious player cannot take combat actions; NPC turns still progress or encounter pauses per spec.

#### Acceptance Criteria
- [x] `resolvePlayerTurn` routes to combat handler when an active encounter exists
- [x] Player attack intent on the player's turn produces `CombatAttackResult` in `TurnResult` and updates NPC HP in DB
- [x] Off-turn player submissions are rejected without mutating encounter state
- [x] Ad-hoc NPC reaction attacks do not apply damage during an active encounter
- [x] Unit/integration tests cover player attack turn, off-turn rejection, and auto-end on last hostile defeated

### 031.8 NPC and party combatant turn resolution


#### Description
When initiative advances to a non-player combatant during an active encounter, resolve that turn automatically before returning control to the player.

**NPC turns:**
- call `generateNpcReaction` (or a slimmer combat-turn variant) with combat context: active encounter, who is acting, valid targets, and post-resolution attack flag
- engine resolves NPC attack against player (or party target selection rule from spec) using persisted NPC attack bonus and damage derived from catalog stats or fallback template — retire hardcoded `NPC_ATTACK_BONUS` / `NPC_DAMAGE_ROLL` constants for encounter combat
- apply conditions when engine rules trigger them (e.g. player unconscious)

**Party member turns:**
- reuse `decidePartyMemberAction` with combat context; when the member attacks, resolve against a valid hostile NPC using the same engine paths as the player where applicable
- append events for each combatant turn

Advance initiative after each NPC/party turn until the next player slot or encounter end.

#### Acceptance Criteria
- [x] NPC turn during encounter can damage the player using stats from the NPC row, not fixed constants
- [x] Party member combat turn produces an event and may damage a hostile NPC when the action is an attack
- [x] Defeated NPCs are skipped on future turns
- [x] Multi-NPC turns in one player submission (catch-up) are bounded — document max steps to prevent infinite loops
- [x] Tests cover single NPC turn hit/miss and party member attack against hostile NPC

### 031.9 Combat state IPC + play-view HUD


#### Description
Expose read-only combat state to the renderer and add a compact combat HUD in the in-campaign play view (column 2 or 3 per layout — keep it visible without obscuring exposition).

HUD shows:
- initiative order list with names; highlight active combatant
- HP current/max for player and hostile NPCs in the encounter (party member HP optional v1)
- condition chips when present (map engine `Condition` enum to short labels)
- encounter round number

Wire:
- preload + main IPC: `getCombatState(campaignId)` returning null when idle
- play view subscribes/refreshes after each `resolvePlayerTurn` result (include combat snapshot on `TurnResult` to avoid extra round-trip when possible)

Responsive rules: HUD collapses to a minimal strip on narrow breakpoints (reuse 018.9 patterns).

#### Acceptance Criteria
- [x] Renderer can fetch combat state for the active campaign via typed IPC
- [x] HUD renders initiative order and highlights whose turn it is
- [x] Player and in-encounter hostile NPC HP display updates after each turn
- [x] HUD hidden when no active encounter
- [x] No new security regressions (narrow channel, no raw SQL)

### 031.10 Combat events + DM narration grounding


#### Description
Append structured combat events to the campaign event log and include encounter context in DM narration assembly so post-attack narration references correct HP and who acted.

Event types (minimum):
- `combat_started` — participant ids, initiative order
- `combat_attack` — attacker ref, target ref, hit/miss, damage, crit flag
- `combat_turn_advanced` — new active combatant, round
- `combat_ended` — outcome, survivors

Update `assembleNarrationContext` (or combat-specific narration helper) to include: active encounter summary, last attack result, and visible combatant HP bands so the DM agent does not contradict engine state.

Narration prompt reminder: describe outcomes already resolved; never invent new damage.

#### Acceptance Criteria
- [x] Each player attack and NPC combat turn appends at least one `combat_attack` event with machine-readable payload
- [x] DM narration context includes last combat beat when an encounter is active
- [x] Events are queryable by campaign + type for future log-book/journal surfacing (no UI required in this ticket)
- [x] Unit tests verify event payload shapes and narration context includes encounter snapshot

### 031.11 End-to-end combat encounter smoke test


#### Description
Validate the full combat loop in a real running app (or high-fidelity integration harness with scripted provider), matching the v1 smoke criterion in revisit 021.3.

Scenario minimum:
1. Seed a campaign with a hostile NPC in the current region (hydrated stats)
2. Player action triggers encounter start
3. Initiative order is established and visible in HUD
4. Player attacks on their turn — observe at least one **hit** and one **miss** across the encounter (may use scripted RNG)
5. NPC turn applies damage or misses; player HP changes when hit
6. Encounter ends when the hostile is defeated; HUD clears

Deliver:
- `src/db/combatEncounterSmoke.test.ts` (or equivalent) runnable via `npm test`
- `docs/runbooks/combat-encounter-smoke-test.md` with automated + manual steps
- optional `scripts/combat-encounter-smoke.mjs` if consistent with other epic smoke scripts

#### Acceptance Criteria
- [x] Automated test resolves a full encounter: initiative, attacks, HP changes, crit or miss observed, encounter end
- [x] Rules engine remains authoritative — provider output cannot directly change HP
- [x] Restart mid-encounter preserves initiative order and HP (load active encounter from DB)
- [x] Runbook documents manual verification in dev Electron app
- [x] `npm test`, `npm run lint`, and `npm run build` pass with the new smoke coverage
