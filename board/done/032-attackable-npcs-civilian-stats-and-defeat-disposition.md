# EPIC: Attackable NPCs, civilian stat blocks, and defeat disposition

Every NPC in the world should be a **valid combat target** with real mechanical stats — not only catalog monsters. When the AI creates an NPC (campaign generation or runtime), assign the standard **villager** stat block by default: low HP, modest AC, weak attacks.

At creation, every speaking NPC gets a **light backstory** (a few sentences) persisted on the row. That backstory is the canonical identity record: it should inform how the model writes **disposition** at generation time and how the NPC **behaves in play** (reactions, tone, defeat choices). Runtime agents read the stored backstory — they do not invent a new past.

Immediately after a speaking NPC's backstory is persisted at creation, run a **retired adventurer review** that reads **only** that persisted backstory (plus alignment) — not at combat start. The review asks: did generation already establish a meaningful combative past? Upgrades must be **unlikely** — default `false` for almost everyone. A reformed bandit leader or retired guard captain *might* upgrade if that history is already in the generated backstory; a farmer never should. Deciding this at creation means combat start never makes an extra agent call for it — `combat_tier` is already settled by the time any encounter begins, which matters because a turn that starts combat can already trigger turn-review (029.2) and combat-intent (031.4) calls; stacking a third one behind those would add latency for no reason.

Speaking NPCs carry **alignment** (epic 028). When an NPC **defeats** the player, alignment and the same persisted backstory drive **defeat disposition** — imprison, bury out back, execute, etc. The engine owns life/death/imprisonment; agents propose disposition and narration only.

Complements epic **031** (encounter mode). Epic 031 owns turn structure; this epic owns **NPC identity at creation**, **who they are in combat**, and **what happens when they win**.

Broken down into sub-tickets 032.1–032.11. This epic is done when all of them are.

Definition of done:
- shared types document villager vs retired-adventurer tiers, defeat disposition, and death-mode rules
- speaking NPCs persist light backstory + alignment + villager combat stats at creation
- generation co-writes backstory and disposition so disposition reflects the past; combative histories are unlikely in prompts
- NPC reaction agents ground on persisted backstory for ongoing behavior
- any in-scene NPC is attackable; provoking shifts disposition
- creation-time review upgrades stats only when stored backstory already supports it (unlikely); combat start reads the decided tier and never calls the review agent
- NPC victor defeat disposition uses stored backstory + alignment
- defeat outcomes respect death mode; UI surfaces backstory and defeat beats
- smoke test covers mundane villager, unlikely veteran upgrade from pre-seeded backstory, and contrasting defeat dispositions

032.1 spec + shared types · 032.2 engine villager + retired-adventurer stat blocks · 032.3 NPC backstory field + villager hydration at create · 032.4 campaign generation backstory, alignment, and disposition · 032.5 NPC agent behavior grounding from persisted backstory · 032.6 attackable any-scene NPC + disposition shift on provoke · 032.7 retired-adventurer review at NPC creation (read stored backstory only) · 032.8 defeat disposition agent + schema · 032.9 defeat outcome persistence + death-mode wiring · 032.10 UI backstory in review + defeat banner · 032.11 end-to-end smoke test

## Sub-tickets

### 032.1 Spec + shared types (stat tiers, defeat disposition, death-mode rules)

#### Description
Document NPC combat profile tiers and post-defeat behavior. Add shared types under `/shared` for engine, DB, agents, `turnIpc`, and renderer.

Cover:
- **`backstory`**: light past-history text written at NPC creation and immutable to runtime agents (read-only grounding). Distinct from `disposition` (relationship/attitude toward the player) but disposition should be **consistent with** backstory when both are generated together.
- **Stat tiers**: `villager` (default), `retired_adventurer` (unlikely upgrade decided once at NPC creation, not at combat start), `catalog` (epic 023 / 031.3 — takes precedence when linked)
- fixed engine numbers per tier — agents pick tier/profile label only, never HP/AC/damage
- **retired adventurer** sub-profiles (`brawler`, `skirmisher`, `veteran`) → deterministic stat mapping
- **review policy**: default `upgrade: false`; `upgrade: true` only when **persisted backstory** already explicitly describes meaningful combat experience — ambiguous flavor, vague hints, or model invention at review time must stay false. No new backstory may be added during review.
- **defeat disposition** enum: `imprison`, `bury_out_back`, `leave_unconscious`, `execute`, `ransom`, `mercy_release` — chosen using alignment + the same persisted backstory
- death-mode interaction (Legendary / Standard / Respawn) per disposition
- worked examples: retired guard captain backstory + lawful_good → imprison; reformed bandit backstory + chaotic_good → bury_out_back

#### Acceptance Criteria
- [x] Spec documents tier precedence: catalog > retired_adventurer > villager
- [x] Spec states backstory is write-once at creation and read-only for all runtime agent calls in this epic
- [x] Shared types export `NpcCombatTier`, `RetiredAdventurerProfile`, `DefeatDisposition`, and `NpcDefeatOutcome` shapes
- [x] Spec documents that retired-adventurer upgrade is unlikely, evidence must come from stored backstory only, and the decision happens once at NPC creation rather than at combat start
- [x] Unit tests validate enum parsing and defeat-disposition JSON guards

### 032.2 Engine villager + retired-adventurer stat blocks

#### Description
Add pure `/engine` functions that return deterministic combat stats for civilian NPC tiers. No DB or LLM imports.

**Villager** (default): low HP (~4–8), AC ~10–11, weak attack bonus (+0 to +1), small damage die (e.g. 1d4 unarmed/improvised). Suitable for farmers, innkeepers, generic townsfolk.

**Retired adventurer** profiles (rare upgrade): meaningfully higher HP/AC/attack — still below a fresh level-5 PC, but dangerous to underestimate. Three profiles with fixed spreads documented in 032.1.

Export `getNpcCombatStats(tier, profile?)` returning `{ hp, maxHp, ac, attackBonus, damageRoll }` for hydration callers.

Catalog-linked NPCs continue to use catalog stats (031.3); this engine module is the source of truth for villager and retired-adventurer numbers only.

#### Acceptance Criteria
- [x] Villager stats are fixed constants with unit tests asserting exact HP/AC/attack/damage values
- [x] Each `RetiredAdventurerProfile` maps to a distinct, tested stat block stronger than villager but bounded (document max HP/AC in spec)
- [x] Engine functions are importable from `/db` and `/main` without pulling Electron or provider code
- [x] No agent-generated numbers enter this layer

### 032.3 NPC backstory field + villager hydration at create

#### Description
Extend the `npcs` table and repository with:
- `backstory` TEXT — light past history (1–3 sentences) written at NPC creation; **required for speaking NPCs**; runtime agents read but never overwrite
- `combat_tier` TEXT — `villager` | `retired_adventurer` | `catalog` (default `villager`)
- `retired_adventurer_profile` TEXT nullable
- combat stat columns from 031.2 if not already present (`hp`, `max_hp`, `ac`, …)

On `createNpc` and campaign-generation persist: when combat stats are unset and no `catalog_creature_key`, hydrate **villager** tier via 032.2. Store `combat_tier = 'villager'`. For speaking NPCs, once `backstory` is persisted this same create path chains into the retired-adventurer review (032.7) before returning — tier is fully decided by the time `createNpc` resolves, not deferred to combat start.

Migration: existing NPCs get empty backstory and villager-tier stats; campaign review may show empty backstory until regen. A backfill pass may also run the 032.7 review against any existing non-empty backstory, idempotently.

#### Acceptance Criteria
- [x] `createNpc` persists `backstory` and applies villager combat stats when no catalog link exists
- [x] `createNpc` triggers the 032.7 review for speaking NPCs before returning, so `combat_tier` is final at creation time
- [x] Repository exposes backstory on read; no repository method allows runtime agent overwrite in v1
- [x] Migration backfills villager stats without overwriting catalog-hydrated stats
- [x] Unit tests cover create, backfill, and skip-when-catalog-linked

### 032.4 Campaign generation: backstory, alignment, and disposition

#### Description
Extend `GeneratedNpc` and campaign-generation prompts so every **speaking** NPC is created with a coherent identity bundle:

- **`backstory`**: light past history (1–3 sentences) — the canonical record for all later agent grounding
- **`alignment`**: required (existing 028 rule)
- **`disposition`**: attitude toward the player **informed by** `backstory` (e.g. a reformed bandit is wary but fair; a retired guard is dutiful; a gossiping baker is chatty). Disposition must not contradict the backstory.

Prompt guidance:
- **Most** NPCs are ordinary people with mundane backstories (farmer, baker, dockhand) — no adventuring past
- A combative or adventuring past in backstory should be **unlikely** — not quota-driven, but the prompt and examples should make clear that veterans are exceptions, not the default cast
- When a veteran past *is* included, state it plainly in backstory so combat review (032.7) can read it later — do not hide it only in disposition prose
- Beasts / `canSpeak: false` omit backstory and alignment

Update `NPC_JSON_EXAMPLE` to show backstory + disposition alignment, validators, `normalizeGeneratedNpc`, `persistRegionWithNpcs`, fixtures, and campaign review loading. `persistRegionWithNpcs` persists each speaking NPC through the same `createNpc` path that chains into the 032.7 review (032.3) — campaign generation does not call the review separately or batch it differently from any other creation path.

#### Acceptance Criteria
- [x] Generation schema rejects speaking NPCs missing `alignment`, `backstory`, or `disposition`
- [x] Prompt requires disposition to reflect backstory; examples show mundane majority and unlikely veteran exceptions
- [x] `canSpeak: false` NPCs do not require backstory or alignment
- [x] Integration tests assert backstory and disposition persist together on `createNpc`

### 032.5 NPC agent behavior grounding from persisted backstory

#### Description
Wire the stored `backstory` into ongoing NPC behavior so generation-time identity actually shapes play — not only combat review.

Update `assembleNpcContext` and `generateNpcReaction` prompts (and any combat-turn NPC variant from 031.8) to include:
- full persisted `backstory`
- `disposition`, `alignment`, `temperament`, `role` (existing fields)

Prompt instruction: roleplay and react **in character according to the backstory**; do not contradict or extend the canonical past with new biographical claims. Memories and world facts supplement scene context but do not replace backstory.

Optional: DM narration context when an NPC is salient includes one-line backstory summary for consistency.

#### Acceptance Criteria
- [x] `assembleNpcContext` (or equivalent) surfaces `backstory` to all NPC agent calls in this repo
- [x] Speaking and non-speaking NPC prompts reference backstory explicitly
- [x] Unit tests assert prompt assembly includes persisted backstory from DB fixture
- [x] Agents do not receive a path to mutate `backstory` on the NPC row

### 032.6 Attackable any-scene NPC + disposition shift on provoke

#### Description
Ensure the player can mechanically attack **any NPC in the current region/scene**, not only pre-flagged hostiles or catalog creatures. Wire into epic 031 combat intent (`attack` + `targetNpcId`) and DM turn routing (029) when available.

Behavior when attacking a non-hostile NPC:
- valid target if NPC is alive and present in the current region
- shift `disposition` toward hostile (document exact rule in 032.1)
- start or join encounter per 031.6 with the provoked NPC as participant
- villager stats apply unless the creation-time retired-adventurer review (032.7) already upgraded this NPC — no review runs at attack/provoke time, tier was decided when the NPC was created

Renderer: player references NPC by name in action input; DM intent resolves `targetNpcId`.

#### Acceptance Criteria
- [x] Player attack intent against a friendly/neutral NPC in-region succeeds mechanically and provokes combat
- [x] NPC disposition updates to reflect hostility after being attacked
- [x] Dead or absent NPCs are rejected as targets with a clear error
- [x] Tests cover provoke-farmer scenario and already-hostile NPC attack

### 032.7 Retired-adventurer review at NPC creation (read stored backstory only)

#### Description
Run the one-shot **retired adventurer review** at NPC creation time, immediately after a speaking NPC's `backstory` is persisted (032.3/032.4) — not at combat start. By the time any encounter begins, `combat_tier` is already settled; combat start only ever reads the stored tier, it never triggers a review call. This removes an LLM round-trip from the combat-start path entirely, where it would otherwise stack behind turn-review (029.2) and combat-intent (031.4) on the same player submission.

Applies uniformly wherever a speaking NPC is persisted with a backstory — campaign generation's batch NPC persist path and any future runtime NPC-creation path both chain into the same review call from `createNpc`/the persist step, not from two separate call sites.

**Input context (read-only):** persisted `backstory`, plus `name`, `role`, `alignment`, `disposition`, `temperament`. Do not pass scene narration or ask the model to invent biography — at creation time there is no scene yet anyway.

**Output schema:**
```json
{"upgrade": false}
```
or
```json
{"upgrade": true, "profile": "brawler"|"skirmisher"|"veteran"}
```

**Prompt rules:**
- default and expected outcome: `upgrade: false` — **unlikely** to upgrade
- `upgrade: true` only when stored backstory **already explicitly** establishes real combat/adventuring experience (e.g. "retired town guard captain", "former bandit who went straight after a decade on the road")
- vague hints ("seems tough", "old scar") → `false`
- if backstory is mundane (farmer, baker, clerk) → `false` always
- agent must not add, rewrite, or extrapolate backstory in `reason` fields — optional reason must cite existing text only
- no per-encounter upgrade quota; statistical unlikelihood comes from prompt bias + mundane generation (032.4)

On `upgrade: true`, engine applies 032.2 stats and persists tier/profile on the NPC row at creation. Idempotent if re-run (e.g. a migration backfill pass over existing NPCs) — does not reset an already-decided tier.

#### Acceptance Criteria
- [x] Review runs once, at NPC creation/persist time, for every speaking NPC — never triggered by encounter/combat start
- [x] Review agent schema validated with retries; invalid output defaults to `upgrade: false`
- [x] Mundane backstory fixture always yields `upgrade: false`
- [x] Pre-seeded "retired guard captain" backstory *can* yield `upgrade: true` in a dedicated fixture (not required every run)
- [x] Upgrade mutates stats via engine tier lookup only; review input is strictly the just-persisted backstory, not live scene state
- [x] Tests prove review prompt does not include instructions to invent new NPC history
- [x] Combat-start orchestration (031.6) makes zero agent calls related to NPC tier — it only reads `combat_tier` already on the row

### 032.8 Defeat disposition agent + schema

#### Description
When the player loses an encounter and a **speaking NPC** is the victor (rule in 032.1), call a defeat-disposition agent.

**Input (read-only identity):** victor's persisted `backstory`, `alignment`, `disposition`, `role`, `name`; player summary; campaign death mode; encounter context. Do not invent new victor biography.

**Output schema:**
```json
{
  "disposition": "imprison"|"bury_out_back"|"leave_unconscious"|"execute"|"ransom"|"mercy_release",
  "narrationText": "what the victor does in scene",
  "locationTag"?: "string"
}
```

Disposition should follow **alignment + backstory already on file** — e.g. lawful-good retired guard backstory → `imprison`; chaotic-good reformed bandit backstory → `bury_out_back`. Agents never set HP or death flags.

Non-speaking creature victors: deterministic fallback (e.g. `leave_unconscious`) without agent call.

#### Acceptance Criteria
- [x] Schema validates disposition enum and required narration text
- [x] Scripted tests use **pre-persisted** backstory fixtures (not inline prompt invention)
- [x] Lawful-good guard captain backstory → `imprison`; reformed bandit backstory → `bury_out_back`
- [x] Prompt includes death mode and forbids contradicting stored backstory
- [x] Non-speaking victors skip agent call

### 032.9 Defeat outcome persistence + death-mode wiring

#### Description
Persist defeat outcomes on the player character (or campaign-scoped defeat record) and apply engine effects per disposition + death mode.

Suggested `playerDefeatState`:
- `disposition`, `victorNpcId`, `locationTag`, `resolvedAt`, `narrativeSummary`
- flags: `imprisoned`, `buried`, `awaiting_ransom`

Engine wiring per disposition (Legendary / Standard / Respawn documented in 032.1). Append `player_defeated` event including victor id and disposition for log-book grounding.

Hook into `turnIpc` / dying resolution after NPC victor is known (031.8).

#### Acceptance Criteria
- [x] `imprison` persists and gates play until escaped (minimal v1: flag + DM context)
- [x] `execute` routes through existing death-mode handlers
- [x] `bury_out_back` tested for at least Standard + Legendary death modes
- [x] Defeat state survives app restart
- [x] Unit tests for imprison, bury, execute dispositions

### 032.10 UI: NPC backstory in review + defeat outcome banner

#### Description
Surface persisted identity and defeat beats in the renderer.

**Campaign review** (extend 028.8):
- show `backstory` per speaking NPC alongside `disposition` and `alignment` so players can see how they relate
- optional read-only combat tier badge after unlikely upgrade

**Play view:**
- defeat disposition banner (`role="alert"`) after NPC victory
- imprisoned status indicator until cleared

Backstory is read-only in UI (like post-setup player alignment). Player may edit disposition in campaign review per 028.8 — backstory stays as generated unless a future curation epic says otherwise.

#### Acceptance Criteria
- [x] Campaign review shows backstory + disposition + alignment together per speaking NPC
- [x] Defeat disposition banner appears in DM exposition after NPC victory
- [x] Imprisoned players see a visible status indicator
- [x] Accessible markup matches existing warning banner patterns

### 032.11 End-to-end smoke test (villager, unlikely veteran, defeat dispositions)

#### Description
Validate the full loop. All NPC identity in tests must come from **generation-style fixtures** (persisted backstory at create), not ad-hoc strings at combat time.

**Scenario A — mundane villager:**
1. NPC created with baker/farmer backstory + villager stats
2. Player attacks → combat runs at villager stats; review returns `upgrade: false`
3. NPC reactions in play reference backstory tone (032.5)

**Scenario B — unlikely veteran (pre-seeded at create):**
1. NPC created with explicit "retired guard captain" backstory — creation-time review (032.7) reads it and returns `upgrade: true` before the NPC is ever in a scene
2. Stats in DB exceed villager baseline immediately after creation, with no agent call at combat start
3. Combat start simply reads the already-upgraded `combat_tier`

**Scenario C — defeat dispositions (backstory on file):**
1. Loss vs NPC with guard-captain backstory + lawful_good → `imprison`
2. Loss vs NPC with reformed-bandit backstory + chaotic_good → `bury_out_back`

Deliver: `src/db/npcCombatDispositionSmoke.test.ts`, `docs/runbooks/npc-combat-disposition-smoke-test.md`

#### Acceptance Criteria
- [x] Automated test uses create-time backstory fixtures for all three scenarios
- [x] Mundane backstory never upgrades; veteran fixture only upgrades when backstory explicitly supports it, and the upgrade decision happens at creation, not at combat start
- [x] Test asserts no review-agent call occurs during encounter start (combat-start path only reads `combat_tier`)
- [x] Defeat dispositions align with pre-persisted backstory + alignment
- [x] Engine stat values match 032.2 tiers
- [x] Runbook documents manual verification in dev app
