# EPIC: NPC face-token image generation

First implementable slice of moonshot **m001**, scoped to **NPC face tokens only**. Social stream avatars today use a letter initial in a circle (`social-avatar`); the NPC dossier modal (**105**) reserves empty space to the right of Traits/Facts for a portrait. This epic generates, persists, and surfaces **face-token** images for speaking NPCs—head/shoulders portraits, not full-body combat tokens.

**Enemy / combat creature tokens** are sibling epic **123** (not this one). Scene backgrounds, region seeds, DM/player-view backgrounds, and **player-party** character visuals remain on the remaining **m001** sub-tickets.

Builds on **105** (dossier layout + Traits section), **085** (Social avatars), **052** / **051** / **068** (identity traits), **m001.1** (image generation architecture + provider fallback contract).

## Target UX

```
Campaign settings (toggle OFF by default)
  └── "Generate NPC face tokens" ── OFF → no generation; existing fallbacks only
        ON  → async face-token jobs for eligible speaking NPCs

Generation (non-blocking)
  Speaking NPC created or traits updated (when toggle ON)
        │
        ▼
  Queue face-token job (mock/local/cloud per m001.1 contract)
        │
        ├── success → persist asset on NPC; stable on reload
        └── failure/skip → no gameplay block; fallbacks unchanged

Surfaces
  ├── Social stream ── avatar shows face token when stored; else letter initial in circle
  └── NPC dossier (105) ── portrait slot right of Traits/Facts; empty when no token (no broken image)
```

Face tokens are **stable per NPC** once stored; regeneration policy is out of v1 unless traits materially change (see 121.4).

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **NPC tokens only.** Scope is speaking-NPC face tokens. Enemy/combat creature tokens are sibling epic **123**. |
| 2 | **Campaign toggle, default OFF.** Per-campaign setting controls whether face-token generation runs. |
| 3 | **Local provider (llamacpp) default OFF.** v1 must not assume local LLMs paint tokens; cloud/mock paths per **m001.1** without requiring llamacpp. |
| 4 | **Face tokens, not full-body.** Head/shoulders portrait suitable for Social circle and dossier slot—not battle map tokens. |
| 5 | **Appearance traits first-class.** `hairColor`, `age`, `eyeColor` (and existing identity traits) for **speaking** NPCs—schema, generation inputs, Traits display. |
| 6 | **Stable per NPC once stored.** Same NPC shows the same face token across sessions until explicitly replaced by a future regen policy. |
| 7 | **Non-blocking.** Create, play, dossier open, and Social render never wait on image generation. |
| 8 | **Fallback.** Social: letter initial in circle when no token. Dossier: empty portrait slot—never a broken image placeholder. |

## Definition of done

- Campaign toggle (default OFF) and local-provider defaults documented and wired; OFF skips all NPC face-token generation
- Speaking NPCs can store `hairColor`, `age`, `eyeColor`; visible in dossier Traits when set
- Typed face-token generation contract + prompt; mock provider unit tests
- Face-token asset persisted on NPC with clear lifecycle (create, read, optional replace)
- When toggle ON, generation schedules async after NPC create/update; toggle OFF never enqueues
- Social avatar prefers stored face token; falls back to letter initial
- Dossier shows portrait in slot right of Traits/Facts; empty state when no token
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; **act** CI workflows (`pr-checks`, `deadcode`) succeed

121.1 toggle + provider defaults → 121.2 appearance traits → 121.3 generation contract → 121.4 persist + lifecycle → 121.5 scheduling → 121.6 Social → 121.7 dossier portrait → 121.8 tests + delivery gate

## Relationship to other epics

| Epic / moonshot | Integration |
|-----------------|-------------|
| **m001** / **m001.1** | Provider architecture, fallback, shared image pipeline primitives |
| **105** | Dossier modal; portrait slot beside Traits/Facts |
| **085** | Social `social-avatar` surface |
| **052** / **051** / **068** | Identity trait labeling and Campaign Review patterns |
| **m001.6** (remaining) | Player-party visuals + shared pipeline; NPC face tokens owned by **122** (legacy body ids **121.x**) |
| **123** (enemy tokens) | Combat creature tokens—not in scope here |

## Out of scope (this epic)

- Enemy / combat creature / map tokens (see epic **123**)
- Full-body character renders
- Player-party portrait generation (see **m001.6** remaining scope)
- Scene, region, DM exposition, or player-view background images (**m001.2**–**m001.5**)
- Blocking UI spinners on dossier open or Social row render while images generate
- Manual "regenerate portrait" button (candidate follow-up)
- Requiring local llamacpp for v1 ship criteria

## Sub-tickets

### 121.1 Campaign NPC-image toggle + local-provider defaults

#### Description

Per-campaign setting: generate NPC face tokens (default **OFF**). Document and enforce that local image provider (llamacpp) defaults **OFF**; v1 paths must work with mock/cloud without assuming local LLM painting.

#### Acceptance criteria

- [ ] Campaign stores NPC face-token generation enabled flag; default false on create
- [ ] Settings UI (or existing campaign settings surface) exposes toggle with clear copy
- [ ] Local-provider default OFF is reflected in config/docs; no hard dependency on llamacpp for tests
- [ ] Unit tests: toggle OFF prevents enqueue hooks from firing (stubbed)

### 121.2 NPC appearance traits — hair, age, eyes (schema, generation, Traits display)

#### Description

Add `hairColor`, `age`, `eyeColor` for speaking NPCs: DB/schema, NPC create/update paths, dossier Traits display (reuse **105** / Campaign Review labeling patterns).

#### Acceptance criteria

- [ ] Schema + migration for appearance fields on speaking NPCs (nullable where appropriate)
- [ ] Generation/promote paths can populate fields when available
- [ ] Dossier Traits section shows hair, age, eyes with empty states when null
- [ ] Unit tests for serialization and dossier DTO inclusion

### 121.3 Face-token generation contract + prompt (typed API, mock provider tests)

#### Description

Typed request/response contract for NPC face-token generation: identity + appearance traits, campaign style hook (stub OK for v1), portrait framing constraints. Prompt builder + mock provider tests per **m001.1**.

#### Acceptance criteria

- [ ] Shared typed API for face-token generation (entity id, traits, style context)
- [ ] Prompt enforces head/shoulders face token, not full-body
- [ ] Mock provider tests cover success and failure payloads
- [ ] No direct UI coupling in generation module

### 121.4 Persist token asset on NPC + lifecycle

#### Description

Store generated face-token asset reference (and metadata) on the NPC row or linked asset table; load on campaign open; define v1 lifecycle (write once on success, stable read).

#### Acceptance criteria

- [ ] Successful generation persists asset binding on NPC; survives app restart
- [ ] IPC or dossier/social DTOs expose token URL/path when present
- [ ] Missing or corrupt asset does not crash consumers; treated as no token
- [ ] Unit tests for persist, read, and missing-asset handling

### 121.5 Generation scheduling when toggle ON (async, non-blocking; OFF skips)

#### Description

When campaign toggle is ON, schedule face-token generation after relevant NPC create/update events; async queue per **m001.9** patterns where available. Toggle OFF: no jobs enqueued.

#### Acceptance criteria

- [ ] Toggle ON enqueues generation for eligible speaking NPCs without blocking create/play IPC
- [ ] Toggle OFF never enqueues; existing NPCs without tokens keep fallbacks
- [ ] Failures logged; gameplay state transitions unaffected
- [ ] Tests with fake queue/provider assert enqueue/skip behavior

### 121.6 Social avatar uses face token

#### Description

Update Social stream NPC avatar (`social-avatar`): render stored face token when available; otherwise letter initial in circle (**085** behavior preserved).

#### Acceptance criteria

- [ ] Speaking NPC rows show face token image when asset exists
- [ ] Fallback to letter initial when no token or load error
- [ ] Component tests for token vs initial paths
- [ ] No layout shift that blocks reading the stream during async generation

### 121.7 Dossier portrait slot (right of Traits/Facts)

#### Description

Fill **105** portrait reserved area: show face token when stored; empty slot when not—no broken-image icon or spinner on open.

#### Acceptance criteria

- [ ] Portrait renders in dossier layout right of Traits/Facts per **105** shell
- [ ] Empty state when no token (neutral placeholder or blank—no `<img>` error UI)
- [ ] Token display uses same asset as Social for consistency
- [ ] Component tests: with token, without token, load failure

### 121.8 Tests, smoke, delivery gate

#### Description

End-to-end coverage, manual smoke runbook (toggle ON/OFF, Social + dossier), and full delivery gate including **act** CI.

#### Acceptance criteria

- [ ] Automated tests cover 121.1–121.7 critical paths
- [ ] Runbook: enable toggle, converse/create NPC, verify async token + Social + dossier; OFF verifies fallbacks
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [ ] `.github/workflows/pr-checks.yml` and `deadcode.yml` pass via **act**
