# EPIC: Enemy combat-token image generation

Sibling to NPC face-token epic **122** (file `122-npc-face-token-image-generation.md`; body still uses legacy **121.x** sub-ids). First implementable slice of moonshot **m001** for **enemy / combat creature tokens**.

Enemies are non-speaking `npcs` rows (`role: 'enemy'`, typically `canSpeak: false`) spawned from campaign bestiary species (**116**). Social already shows their **action** lines with letter-initial avatars (`social-avatar`); dossier (**105**) uses the same modal for non-speakers. Species generation today only returns `baseLore` — not enough structured look for a reliable image prompt.

This epic: enrich foe generation with visual descriptors, generate and persist a **creature token** when the enemy (species and/or instance) is created, and surface that token on the **dossier / journal entry** for the foe and in **Social** action rows — same pattern as NPC face tokens.

Builds on **116** (bestiary + spawn), **105** (dossier for non-speakers), **085** (Social avatars), **122** (NPC face-token patterns: toggle, async, fallbacks), **m001.1** (image provider contract).

## Target UX

```
Campaign settings (toggle OFF by default)
  └── "Generate enemy tokens" ── OFF → no generation; letter / empty fallbacks only
        ON  → async token jobs when foes are generated/spawned

Generation (non-blocking)
  Bestiary species created (campaign create / quest / on-demand)
  and/or enemy instance NPC spawned (when toggle ON)
        │
        ▼
  Species lore + visualAppearance fields → queue creature-token job
  (mock/local/cloud per m001.1; reuse pipeline primitives with 122)
        │
        ├── success → persist asset (species-stable; instances inherit)
        └── failure/skip → no gameplay / combat block; fallbacks unchanged

Surfaces
  ├── Social stream ── enemy action rows show token when stored; else letter initial
  └── Enemy dossier / journal entry (105) ── portrait slot; empty when no token
```

Tokens are **stable per species** once stored (all instances of that species share the look unless a later variant policy lands). Regeneration policy is out of v1.

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Enemy / combat creatures only.** Speaking-NPC face tokens stay on epic **122**. Player-party and scene backgrounds stay on **m001**. |
| 2 | **Campaign toggle, default OFF.** Separate from the NPC face-token toggle so players can enable either independently. |
| 3 | **Generate when the foe is generated.** Prefer enqueue at **species create** (all three **116** paths); if an instance spawns and the species still has no token, enqueue then. Toggle OFF never enqueues. |
| 4 | **Enrich generation for token prompts.** Species generation must produce structured **visual appearance** (silhouette, size class, coloring, distinguishing marks, material/texture as applicable) in addition to `baseLore` — enough for a deterministic image prompt without inventing combat stats. |
| 5 | **Species-stable tokens.** Asset binds to bestiary species (instances inherit via `bestiarySpeciesId`). Variant-specific art is out of v1 unless cheap reuse of the same asset with flavor text only. |
| 6 | **Creature token framing.** Prompt targets a **token-suitable creature portrait** (recognizable silhouette for Social circle + dossier slot)—not battle-map grid tokens, not full environment scenes. Humanoid foes may still be head/shoulders; beasts/monsters may show more of the body as needed for recognition. |
| 7 | **Local provider (llamacpp) default OFF.** Same as **122** / **m001.1**: mock/cloud paths must work without assuming local LLM painting. |
| 8 | **Non-blocking.** Species create, encounter spawn, combat start, Social render, and dossier open never wait on image generation. |
| 9 | **Fallback.** Social: letter initial when no token. Dossier: empty portrait slot—never a broken image. |
| 10 | **Surfaces match NPC pattern.** Token visible on the enemy’s dossier (the journal/dossier entry for that foe) and on Social action descriptions for that `npcId`, same UX family as **122** Social + dossier. |

## Definition of done

- Campaign toggle (default OFF); OFF skips all enemy-token generation
- Species generation schema/prompts include visual appearance fields; unit tests cover parse + prompt
- Typed creature-token generation contract + prompt; mock provider unit tests; shares **m001.1** / **122** pipeline where practical
- Token asset persisted on species (instances resolve via species link); survives restart
- When toggle ON, generation schedules async after species create / spawn-without-token; OFF never enqueues
- Social enemy action avatars prefer stored token; letter fallback otherwise
- Enemy dossier shows portrait when token exists; empty state when not
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; **act** CI workflows (`pr-checks`, `deadcode`) succeed

123.1 toggle → 123.2 visual appearance in foe generation → 123.3 generation contract → 123.4 persist + lifecycle → 123.5 scheduling on generate/spawn → 123.6 Social → 123.7 dossier / journal portrait → 123.8 tests + delivery gate

## Relationship to other epics

| Epic / moonshot | Integration |
|-----------------|-------------|
| **122** (NPC face tokens) | Sibling; reuse toggle/async/fallback/Social patterns; do not merge scopes |
| **m001** / **m001.1** | Provider architecture, fallback, shared image pipeline |
| **m001.6** | Enemy tokens owned here; player-party remains on m001.6 |
| **116** | Bestiary species/variant/instance spawn; generation hooks |
| **105** | Same dossier modal for non-speakers; portrait slot |
| **085** | Social `social-avatar` for action lines |
| **121** (journal person → dossier) | People/NPC name matching only; enemy tokens do not depend on 121, but dossier open from Social/log book must show the portrait |

## Out of scope (this epic)

- Speaking-NPC face tokens (**122**)
- Player-party portraits (**m001.6**)
- Scene / region / DM / player-view backgrounds (**m001.2**–**m001.5**)
- Battle-map / grid combat tokens
- Per-variant or per-instance unique art (v1 is species-stable)
- Blocking spinners on combat start or Social row render
- Manual “regenerate enemy token” button (candidate follow-up)
- Requiring local llamacpp for v1 ship criteria
- Expanding journal **person** name-matching (**121**) to beast names (candidate follow-up; dossier portrait itself is in scope)

## Sub-tickets

### 123.1 Campaign enemy-token toggle + provider defaults

#### Description

Per-campaign setting: generate enemy creature tokens (default **OFF**), independent of the NPC face-token toggle. Document local image provider default **OFF**; v1 works with mock/cloud without llamacpp.

#### Acceptance criteria

- [ ] Campaign stores enemy-token generation enabled flag; default false on create
- [ ] Settings UI exposes toggle with clear copy (distinct from NPC face-token toggle)
- [ ] Local-provider default OFF reflected in config/docs; no hard llamacpp dependency for tests
- [ ] Unit tests: toggle OFF prevents enqueue hooks from firing (stubbed)

### 123.2 Enemy visual appearance in generation (schema + prompts)

#### Description

Extend bestiary species generation (**116** / `generateSpecies`) beyond `{"baseLore":string}` so each new species gets structured visual fields suitable for image prompts (e.g. silhouette, sizeClass, primaryColors, distinguishingMarks, textureOrMaterial — exact field names locked in implementation SPEC). Persist on species; surface in dossier Traits (or equivalent) when present. Still **no combat numbers** from the LLM.

#### Acceptance criteria

- [ ] Schema + migration for visual appearance fields on bestiary species (nullable where appropriate for legacy rows)
- [ ] Species lore prompts + JSON parse require/populate appearance fields alongside `baseLore`
- [ ] Campaign-create / quest / on-demand generation paths use the enriched contract
- [ ] Unit tests: prompt builder, parse success/failure, serialization; fixtures updated if campaign-create contract affected (follow campaign-create checklist when create stage changes)

### 123.3 Creature-token generation contract + prompt (typed API, mock provider tests)

#### Description

Typed request/response for enemy creature-token generation: species id/name, visual appearance, lore slice, campaign style hook (stub OK for v1), framing constraints. Prompt builder + mock provider tests per **m001.1**; reuse shared pipeline with **122** where practical without coupling scopes.

#### Acceptance criteria

- [ ] Shared typed API for creature-token generation (species id, appearance, style context)
- [ ] Prompt enforces token-suitable creature portrait (not environment scene, not battle-map token)
- [ ] Mock provider tests cover success and failure payloads
- [ ] No direct UI coupling in generation module

### 123.4 Persist token asset on species + instance resolution

#### Description

Store generated token asset reference on the bestiary species (or linked asset table keyed by species). Instance NPCs resolve the token via `bestiarySpeciesId`. Load on campaign open; v1 lifecycle: write once on success, stable read.

#### Acceptance criteria

- [ ] Successful generation persists asset binding on species; survives app restart
- [ ] IPC / dossier / Social DTOs expose token URL/path for enemy instances when species has an asset
- [ ] Missing or corrupt asset does not crash consumers; treated as no token
- [ ] Unit tests for persist, instance resolution, and missing-asset handling

### 123.5 Generation scheduling on species create / spawn (async; OFF skips)

#### Description

When campaign toggle is ON, schedule creature-token generation after bestiary species create (all **116** paths) and after enemy instance spawn when the linked species still lacks a token. Async queue per **m001.9** / **122** patterns. Toggle OFF: no jobs.

#### Acceptance criteria

- [ ] Toggle ON enqueues after species create without blocking create/spawn/combat IPC
- [ ] Toggle ON enqueues on instance spawn only when species has no token yet (idempotent)
- [ ] Toggle OFF never enqueues; existing foes without tokens keep fallbacks
- [ ] Failures logged; gameplay/combat unaffected
- [ ] Tests with fake queue/provider assert enqueue/skip/idempotent behavior

### 123.6 Social avatar uses enemy token

#### Description

Update Social stream avatars for enemy / non-speaking combat action rows: render stored species token when available; otherwise letter initial (**085** / **122** fallback preserved).

#### Acceptance criteria

- [ ] Enemy action rows show token image when asset resolves for that `npcId`
- [ ] Fallback to letter initial when no token or load error
- [ ] Component tests for token vs initial paths (enemy action entries)
- [ ] No layout shift that blocks reading the stream during async generation

### 123.7 Dossier / journal portrait for enemies

#### Description

Fill the dossier portrait slot (**105** / same layout as **122.7**) for enemy instances: show species token when stored; empty when not. Opening from Social or log book must show the same asset. This is the “journal entry on the enemy” portrait surface for v1.

#### Acceptance criteria

- [ ] Portrait renders in dossier for `canSpeak: false` / `role: 'enemy'` when species has a token
- [ ] Empty state when no token (neutral placeholder or blank—no `<img>` error UI)
- [ ] Same asset as Social for that foe
- [ ] Component tests: with token, without token, load failure

### 123.8 Tests, smoke, delivery gate

#### Description

End-to-end coverage, manual smoke runbook (toggle ON/OFF, generate foe, Social action row + dossier), and full delivery gate including **act** CI.

#### Acceptance criteria

- [ ] Automated tests cover 123.1–123.7 critical paths
- [ ] Runbook: enable toggle, generate/spawn foe, verify async token + Social + dossier; OFF verifies fallbacks
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [ ] `.github/workflows/pr-checks.yml` and `deadcode.yml` pass via **act**
- [ ] If campaign-create stage/schema changed: `docs/runbooks/campaign-create-change-checklist.md` followed
