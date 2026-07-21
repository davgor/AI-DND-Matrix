# EPIC: Re-enable and deepen AI party companions

The product pitch and Settings intro still sell **DM + NPC + party-member agents**. Epic **100** (and **099**) intentionally hid the Character Setup “AI Party Members” section while leaving draft/submit wiring intact. Promotion/recruit still exists, but **onboarding companions are gone**, and even when companions exist they are shallow: gear-less at creation (**047**), weak player-order channel, and flee-with-party gaps (**flee SPEC**).

This epic **re-enables companions as a first-class co-star** and deepens the play loop so “two cooperating AI agents” is literally true in single-player — not only ambient flavor or a moonshot **m002** guest identity.

Builds on **006** / `partyMember.ts`, **038** (roster ownership + inactive PC proxy), **011** (promotion), **047** (starting gear), **100** (hide — reverse), **031** / flee SPEC. **m002** assumes party-member identities; this epic is the single-player prerequisite.

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Companions vs multi-PC hub? | **Both.** Hub multi-PC remains protagonists; AI party members are **companions on the active PC’s roster**, not a substitute for other PCs. |
| Re-enable only vs deepen? | **Re-enable + deepen.** Shipping the setup UI alone without gear/orders/flee parity leaves the pitch half-true again. |
| Scope vs multiplayer? | Single-player companion UX only. Guest/`ai-able` stays **m002**. |

## Target UX

```
Character setup
  └── AI Party Members section (restored)
        └── draft companions (name / race / personality) → persist on roster

Play
  ├── Party roster visible (sheet / chrome)
  ├── Player can issue a short order / focus to companions (composer or dedicated affordance)
  ├── Companions act via party-member agent under engine resolution
  ├── Starting / granted gear attachable to companions (at least creation loadout or share/grant path)
  └── Flee / travel: companions follow the active PC unless SPEC marks them left behind
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Restore Character Setup party section** (reverse **100** UI hide). Empty party still allowed. |
| 2 | **Roster ownership** stays per **038** (`owner_player_character_id`). |
| 3 | **Player order channel (v1).** Active PC can give a short natural-language order or stance that grounds the next `decidePartyMemberAction` call(s) for that roster (persisted for the turn / short window per SPEC — not a full command UI language). |
| 4 | **Gear.** Companions can hold equipment: at minimum creation-time starter kit **or** player grant/share from inventory (SPEC picks one primary path; both allowed if cheap). No separate companion spellbook required (**spells SPEC** may stay PC-only). |
| 5 | **Flee / leave scene with PC.** When the player successfully flees or leaves the encounter/scene, roster companions follow unless knocked out / captured / explicitly left (SPEC). Update flee SPEC + tests. |
| 6 | **Combat.** Existing party combat turns remain; deepen only where orders/gear/flee require it. |
| 7 | **Promotion** continues to add members mid-play; setup re-enable must not break **011**. |
| 8 | **Settings / README copy** must match: companions are available again. |

## Definition of done

- Character setup shows AI Party Members; drafts persist onto the active PC’s roster
- Player can issue companion orders that affect party-member agent grounding
- Companions can carry gear via the locked path; sheet/roster reflects it
- Flee/leave follows companions per SPEC; unit/integration coverage
- Promotion + empty-party paths still work
- README / Settings intro accurate
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

129.1 SPEC + product stance · 129.2 Re-enable setup UI · 129.3 Order channel · 129.4 Companion gear · 129.5 Flee/travel follow · 129.6 Roster/sheet UX · 129.7 Docs + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **100** / **099** | UI hide reversed; keep wiring patterns |
| **038** | Ownership + shared/unowned rules unchanged unless SPEC clarifies |
| **011** | Promotion remains a mid-play join path |
| **047** | Starting gear patterns may extend to companions |
| **126** | No dependency (lockout is PC Action; companion Action lockout follow-up OK) |
| **m002** | Guest identity maps onto this roster model later |

## Out of scope (v1)

- Full companion dossiers (**105** out of scope stays)
- Companion spellbooks / separate progression trees
- Formation / tactical grid positioning
- Multiplayer guest `ai-able` (**m002**)
- Replacing inactive-PC proxy with party members

## Sub-tickets

### 129.1 SPEC — companion play contract

#### Description

Document setup re-enable, order channel shape, gear path, flee-follow rules, and roster UX under `src/shared/partyMembers/` (or extend existing party SPEC).

#### Acceptance criteria

- [ ] SPEC locks order persistence window and grounding injection
- [ ] SPEC locks gear path (creation kit and/or grant)
- [ ] SPEC locks flee/leave follow + exceptions
- [ ] Explicit non-goals match Out of scope

### 129.2 Re-enable Character Setup party section

#### Description

Mount `PartyMemberSetup` (or successor) again; empty list OK; submit creates `ai_party_member` rows owned by the new PC.

#### Acceptance criteria

- [ ] Section visible; proceed works with 0..N companions
- [ ] Component/repo tests for create + empty party
- [ ] No regression to race/background continue gates

### 129.3 Player order / stance channel

#### Description

IPC + play UI affordance to set a short companion order; party-member agent context includes it; clears/expires per SPEC.

#### Acceptance criteria

- [ ] Stub-provider test: order text appears in `decidePartyMemberAction` context
- [ ] No order → behavior unchanged from today
- [ ] Metering purpose tagged if new LLM fields (**112**)

### 129.4 Companion gear

#### Description

Implement locked gear path: creation starters and/or inventory grant. Persist on companion character inventory/equipment; visible on sheet/roster.

#### Acceptance criteria

- [ ] Engine/DB tests: grant or starter attach survives restart
- [ ] Invalid catalog ids rejected
- [ ] UI shows companion gear at least in sheet overlay

### 129.5 Flee / travel follow

#### Description

Wire flee success and scene-leave so living companions follow the PC; update flee SPEC + combat/exploration tests.

#### Acceptance criteria

- [ ] Integration test: flee success → companions leave encounter with PC
- [ ] Exception path (unconscious companion) covered per SPEC
- [ ] Flee SPEC markdown updated

### 129.6 Roster / sheet UX polish

#### Description

Ensure active roster is scannable in play (sheet party section and/or chrome); orders + gear visible without hunting.

#### Acceptance criteria

- [ ] Component tests for empty vs populated roster
- [ ] Dead/dismissed members handled cleanly (existing life_status if any)

### 129.7 Docs + smoke

#### Description

Update README pitch / Settings intro; smoke notes for setup → order → combat → flee-with-party. Full delivery gate including `act`.

#### Acceptance criteria

- [ ] README and Settings intro no longer imply companions while UI hides them
- [ ] Smoke notes document the companion loop
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
