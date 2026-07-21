# EPIC: Prompt-generated AI party companions (post-customization, pre-interview)

The product pitch and Settings intro still sell **DM + NPC + party-member agents**. Epics **100** / **099** hid the Character Setup “AI Party Members” section. Promotion/recruit still exists, but **onboarding companions are gone**, and companions that do exist are shallow (gear-less at creation, weak orders, flee-with-party gaps).

This epic restores companions as a **dedicated onboarding step** — **after character customization (race → background → equipment), before the DM identity interview** — where the player enters a **free-text prompt** and the **engine + agent generate** a companion from that prompt.

**Companion face-token images** moved to epic **139** (depends on **122** / m001 pipeline). This epic may keep appearance fields on the generate contract for later painting, but **image enqueue is out of DoD**.

Builds on **006** / `partyMember.ts`, **038** (roster ownership), **011** (promotion), **047** (gear), **026** / guided phase machine, **100** (hide — do **not** restore the old Character Setup section). **m002** guest identity maps onto this roster later.

## Onboarding placement (locked)

Current phases: `race` → `background` → `equipment` → `identity` → `opening_scene` → `complete`.

**New phase:** `companions` (canonical SPEC value).

```
equipment (starting gear)     ← end of mechanical + customization
        │
        ▼
companions                    ← NEW: prompt → generate companion(s)
        │  skip allowed (0 companions)
        ▼
identity                      ← DM interview (“Tell me about yourself”)
        │
        ▼
opening_scene → complete → hub / play
```

Stage routing (`stageRouting.ts` / `GUIDED_CREATION_PHASES`) gains a matching onboarding stage (e.g. `companionPrompt`) between `equipmentSelection` and `guidedIdentity`.

## Target UX

```
After equipment confirm
  └── Companion step
        ├── Prompt field: “Describe who travels with you…” (examples optional)
        ├── [Generate] → loading → preview card (name, look, personality, role)
        │     ├── [Accept] → persist ai_party_member on this PC’s roster
        │     ├── [Regenerate] → new roll from same or edited prompt
        │     └── [Skip] / continue with empty party
        └── Optional: add a second companion (SPEC clamp: max N = 1 for v1)

Then → identity kickoff (DM interview) with companion summary in context if present
```

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Companions vs multi-PC hub? | **Both.** Hub PCs are protagonists; AI companions are roster members on the **active** PC. |
| Manual draft fields in Character Setup? | **No.** Do not restore the old Character Setup party section (**100** stays correct for that surface). Generation is prompt-driven on the new step. |
| Face-token images? | **Out of scope here** — epic **139**. Letter-initial / existing portrait fallbacks only. |
| Re-enable only vs deepen? | **Generate + deepen.** Orders, gear, flee-follow remain in scope so play isn’t hollow. |

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Phase order:** after `equipment`, before `identity`. Skipping companions advances to `identity`. |
| 2 | **Prompt → generate.** Player supplies natural-language prompt; agent proposes structured companion fields; **engine validates/clamps** before persist. |
| 3 | **Ground generation in the PC.** Prompt context includes the player’s name, race, background, archetype/gear summary. |
| 4 | **Empty party allowed.** Skip is first-class; play and identity work with zero companions. |
| 5 | **Roster ownership** per **038** (`owner_player_character_id` = creating PC). |
| 6 | **Max companions at this step.** Hard max **1** (`COMPANION_ONBOARDING_MAX`). Mid-play promotion (**011**) still adds more later. |
| 7 | **Identity interview grounding.** When companions exist, identity kickoff / DM context gets a slim companion digest. |
| 8 | **Player order channel (play).** Short natural-language order/stance grounds `decidePartyMemberAction`. |
| 9 | **Gear.** Generated companion receives a starter loadout from engine templates (and/or prompt-tagged kit clamped to catalog). |
| 10 | **Flee / leave follow.** Living companions follow the PC on successful flee/leave unless SPEC exceptions (unconscious, left behind). |
| 11 | **Promotion (**011**)** unchanged as mid-play join; must not require re-entering the companions phase. |
| 12 | **README / Settings** copy matches: companions are created via onboarding prompt, not the hidden Character Setup block. |

## Definition of done

- Onboarding phase sits between equipment and identity; stage routing + persistence correct across restart mid-step
- Prompt generate → accept persists a valid `ai_party_member`; skip → identity with empty roster
- Identity kickoff can see slim companion digest when present
- Play: orders, gear path, flee-follow per SPEC
- Promotion + empty-party paths still work
- README / Settings accurate
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

129.1 SPEC · 129.2 Phase + routing + UI shell · 129.3 Prompt generate · 129.4 Persist + identity grounding · 129.6 Order channel · 129.7 Gear · 129.8 Flee/travel follow · 129.9 Roster/sheet UX · 129.10 Docs + smoke  
*(Former 129.5 face tokens → epic **139**)*

## Relationship to other epics

| Epic / moonshot | Integration |
|-----------------|-------------|
| **100** / **099** | Character Setup stays without party section; new step replaces that UX |
| **026** / guided phases | New `companions` phase + stage |
| **038** | Ownership + roster |
| **011** | Mid-play promotion still works |
| **047** | Starter gear patterns for generated companions |
| **108** | Identity kickoff prior-setup context — extend with companion digest |
| **139** | Companion face-token images (was 129.5) |
| **122** | NPC face tokens — prerequisite for **139**, not this epic |
| **126** | Lockout remains PC Action-focused unless SPEC extends |
| **m002** | Guest identity maps to roster later |

## Out of scope (v1)

- Restoring manual Character Setup party draft UI
- Full companion dossiers (**105** style) — roster + letter/portrait fallback enough
- Companion face-token image generation (**139**)
- Companion spellbooks / separate progression trees
- Formation / tactical grid
- Multiplayer `ai-able` (**m002**)
- Scene/background image gen

## Sub-tickets

### 129.1 SPEC — companions phase + generate contract

#### Description

Document phase name/order, prompt/generate schema, engine clamps, max N, skip rules, identity digest, and play deepen rules (orders/gear/flee). Place under `src/shared/partyMembers/`. Face-token binding notes may remain in SPEC as forward pointers to **139**.

#### Acceptance criteria

- [x] SPEC locks phase order: after equipment, before identity
- [x] SPEC locks prompt → structured companion fields + engine validation
- [x] SPEC locks image: non-blocking, reuse **122**/m001.1 contract, companion entity type *(forward pointer; implementation in **139**)*
- [x] Shared TS types exported; non-goals match Out of scope

### 129.2 Phase machine, routing, and step UI shell

#### Description

Add `companions` to `GUIDED_CREATION_PHASES`; equipment completion → companions; companions complete/skip → identity. Onboarding stage + React step with prompt field, Generate / Accept / Regenerate / Skip. Restart mid-phase restores the step.

#### Acceptance criteria

- [x] Unit tests for `stageForGuidedPhase` / `stageAfterCampaignSelect` include companions
- [x] Equipment confirm lands on companions step (not identity)
- [x] Skip advances to identity with no roster members
- [x] Component tests for empty prompt disabled Generate (or explicit allow per SPEC)

### 129.3 Prompt generate — agent + engine clamp

#### Description

IPC: submit prompt (+ PC context) → agent proposal → engine normalize/clamp → return preview DTO (not yet persisted until Accept). Meter under `onboarding.companion_generate` (**112** / **129.1**).

#### Acceptance criteria

- [x] Stub-provider tests: valid prompt yields clamped companion preview
- [x] Invalid/unsafe stats or unknown race keys dropped or rewritten per SPEC
- [x] PC race/background/gear summary present in agent context
- [x] Regenerate does not leave orphan DB rows if preview-only

### 129.4 Accept persist + identity grounding

#### Description

Accept writes `ai_party_member` owned by the PC; advance phase to `identity`. Identity kickoff / prior-setup context includes slim companion digest when roster non-empty.

#### Acceptance criteria

- [x] Repo tests: accept → roster membership + ownership; restart-safe
- [x] Identity kickoff context test includes companion name/role when present
- [x] Max-N enforced on accept

### 129.6 Player order / stance channel (play)

#### Description

Play affordance to set a short companion order; grounds `decidePartyMemberAction`; expires per SPEC.

#### Acceptance criteria

- [x] Stub-provider test: order appears in party-member context
- [x] No order → prior behavior unchanged

### 129.7 Companion gear

#### Description

Generated companions receive engine-clamped starter gear at accept; visible on sheet/roster.

#### Acceptance criteria

- [x] Persist + restart tests for companion inventory
- [x] Invalid catalog ids rejected

### 129.8 Flee / travel follow

#### Description

Flee success / scene-leave: living companions follow unless SPEC exceptions. Update flee SPEC.

#### Acceptance criteria

- [x] Integration test: flee → companions leave with PC
- [x] Exception path covered
- [x] Flee SPEC updated

### 129.9 Roster / sheet UX

#### Description

Active roster scannable in play (sheet + chrome); shows generated identity + letter-initial / existing portrait fallback (face tokens = **139**).

#### Acceptance criteria

- [x] Component tests: empty vs populated roster
- [x] Avatar uses letter-initial or existing `portraitPath` when no face token

### 129.10 Docs + smoke

#### Description

README + Settings intro; smoke: equipment → prompt generate → accept → identity → play order/flee. Full delivery gate including `act`.

#### Acceptance criteria

- [x] README describes prompt step placement (not Character Setup party block)
- [x] Smoke notes cover skip + generate (images deferred to **139**)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
