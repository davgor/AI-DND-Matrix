# AI party companions — contract (epic **129**)

Prompt-generated companions created on a dedicated onboarding step **after character customization (`equipment`), before the DM identity interview (`identity`)**. Players enter natural-language prompts; the agent proposes structured fields; the **engine clamps** before preview/Accept. Mid-play promotion (**011**) remains a separate join path.

Builds on party-member agent (**006**), roster ownership (**038**), starting gear patterns (**047**), guided phases (**026**), identity grounding (**108**), face-token pipeline (**122** / **m001.1** / **m001.6**). Does **not** restore the Character Setup party draft UI (**100** / **099** stay correct for that surface).

Shared DTOs and clamp helpers live in `src/shared/partyMembers/types.ts`. Phase machine / routing / UI: **129.2**. Generate IPC + agent: **129.3**. Persist + identity digest: **129.4**. Face tokens: **129.5**. Play deepen (orders / gear / flee): **129.6–129.8**.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Phase order.** `equipment` → `companions` → `identity` → `opening_scene` → `complete`. Skip with zero companions advances to `identity`. |
| 2 | **Canonical phase name.** `companions` (`COMPANIONS_GUIDED_PHASE`). Matching onboarding stage lands in **129.2** (e.g. `companionPrompt`). |
| 3 | **Prompt → generate.** Player free-text prompt; agent returns structured proposal; engine `clampCompanionProposal` before UI preview. |
| 4 | **Engine owns combat stats.** Agent may not author authoritative ability scores / HP / AC. Preview omits `abilityScores`; Accept rolls via existing party-member creation patterns. |
| 5 | **PC grounding.** Generate context always includes the creating PC’s name, race, background, archetype, and gear summary (`CompanionGeneratePcContext`). Preview echoes a slim `pcContextDigest`. |
| 6 | **Max N on this step.** Hard max **1** (`COMPANION_ONBOARDING_MAX`). Soft max **2** documented only; v1 Accept enforces hard max. Promotion may add more later. |
| 7 | **Empty party allowed.** Skip is first-class; identity and play work with zero companions. |
| 8 | **Roster ownership.** Accepted companion is `kind: 'ai_party_member'` with `ownerPlayerCharacterId` = creating PC (**038**). |
| 9 | **Race keys.** Unknown / non-catalog race keys rewrite to `human` (`COMPANION_FALLBACK_RACE_KEY`). Blank names reject the proposal (`null` preview). |
| 10 | **Inventory.** Optional catalog item ids on the proposal; unknown ids dropped at clamp. Starter loadout templates may still apply on Accept (**129.7**). |
| 11 | **Identity digest.** When roster non-empty, identity kickoff gets `CompanionIdentityDigest` (name, role, raceKey, characterClass) — no full sheet dump. |
| 12 | **Face tokens.** Entity kind `ai_party_member` + `shouldEnqueueCompanionFaceToken` live here. **Implementation is epic 139** (reuses **122** / m001 stack + campaign `npcFaceTokenGenerationEnabled`). Persist on companion `portraitPath`; Social + roster prefer token with letter-initial fallback. **129** DoD does not require images. |
| 13 | **Metering.** Generate calls use purpose `onboarding.companion_generate` (setup bucket). |
| 14 | **Player orders (play).** Short natural-language stance, max `COMPANION_ORDER_MAX_CHARS` (200), grounds `decidePartyMemberAction` (**129.6**). |
| 15 | **Flee / leave follow.** Living companions follow the PC on successful flee/scene-leave unless SPEC exceptions (unconscious, explicitly left behind) — updates flee SPEC in **129.8**. |
| 16 | **No Character Setup restore.** Manual party draft fields on Character Setup stay hidden. |

## Phase slice

```
… → equipment → companions → identity → opening_scene → complete
```

Const: `COMPANIONS_PHASE_ORDER_SLICE = ['equipment', 'companions', 'identity']`.

`GUIDED_CREATION_PHASES` gains `'companions'` between `'equipment'` and `'identity'` in **129.2** (plus DB CHECK migration).

## Generate flow

```
Player prompt + CompanionGeneratePcContext
        │
        ▼
Agent proposal (CompanionAgentProposal)
        │
        ▼
clampCompanionProposal → CompanionPreviewDto | null
        │
        ├── null → UI error / regenerate
        └── preview → Accept | Regenerate | Skip
              Accept → persist ai_party_member + optional face-token enqueue
              Skip   → identity with empty roster
```

Preview is **not** persisted. Regenerate must not leave orphan DB rows (**129.3**).

### Proposal → preview fields

| Field | Source | Clamp |
|-------|--------|-------|
| `name` | Agent | Required trim; max 80; blank → null preview |
| `characterClass` | Agent | Trim; default `adventurer`; max 80 |
| `personality` | Agent | Trim; max `COMPANION_PERSONALITY_MAX_CHARS` (500) |
| `raceKey` | Agent | Must be in catalog else `human` |
| `role` | Agent optional | Default to class; max 80 |
| `appearance` | Agent optional | Nullable hair/age/eyes strings |
| `inventoryItemIds` | Agent optional | Drop unknown catalog ids |
| `abilityScores` | Agent optional | **Ignored** |
| `ownerPlayerCharacterId` | PC context | Copied from PC |
| `pcContextDigest` | PC context | `name · race · background · archetype` |

## Face-token binding

| Concern | Rule |
|---------|------|
| Entity | `ai_party_member` companion id (not world `npcId`) |
| When | Accept, and campaign `npcFaceTokenGenerationEnabled` ON |
| Blocking | Never — Accept → identity proceeds even if provider throws |
| Surfaces | Social party lines + roster/sheet avatar; letter fallback when missing |
| Pipeline | Shared **122** / **m001.1** (`generateNpcFaceToken`); scheduler in `companionFaceTokenScheduler.ts`; asset → `portrait_path` |
| Docs | Details also in `src/shared/npcFaceTokens/SPEC.md` (epic **139**) |

**129 vs 139:** Companion create/Accept/identity (**129**) must work with letter-initial only. Portrait generation is **139** DoD, not **129**.

## Play deepen (contract only here)

| Topic | Lock |
|-------|------|
| Orders | Optional short stance string; absent → prior `decidePartyMemberAction` behavior |
| Gear | Engine-clamped starters on Accept; invalid catalog ids rejected |
| Flee follow | Override current flee SPEC “party does not auto-flee” for living owned companions on full player escape / scene-leave — details in **129.8** |

## Metering

Purpose id: `onboarding.companion_generate` (`COMPANION_GENERATE_LLM_PURPOSE`). Bucket: **setup**.

## Out of scope (v1)

- Restoring Character Setup party draft UI
- Full companion dossiers (**105**-style)
- Companion spellbooks / separate progression trees
- Formation / tactical grid
- Multiplayer `ai-able` (**m002**)
- Blocking identity on image completion
- Scene/background image gen
- Soft-max 2 companions without an explicit follow-up ticket

## Non-goals vs related epics

| Epic | Boundary |
|------|----------|
| **100** / **099** | Character Setup stays without party section |
| **122** / **123** | World NPC / enemy tokens — not companion entity kind |
| **139** | Companion face-token enqueue / persist / Social+roster surfaces |
| **m001.6** | Player-PC visuals; companion wiring owned by **129** / **139** |
| **011** | Mid-play promotion unchanged; must not require re-entering `companions` |
