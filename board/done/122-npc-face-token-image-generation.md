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

Face tokens are **stable per NPC** once stored; regeneration policy is out of v1 unless traits materially change (see 122.4).

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

122.1 toggle + provider defaults → 122.2 appearance traits → 122.3 generation contract → 122.4 persist + lifecycle → 122.5 scheduling → 122.6 Social → 122.7 dossier portrait → 122.8 tests + delivery gate

## Relationship to other epics

| Epic / moonshot | Integration |
|-----------------|-------------|
| **m001** / **m001.1** | Provider architecture, fallback, shared image pipeline primitives |
| **105** | Dossier modal; portrait slot beside Traits/Facts |
| **085** | Social `social-avatar` surface |
| **052** / **051** / **068** | Identity trait labeling and Campaign Review patterns |
| **m001.6** (remaining) | Player-character visuals + shared pipeline; NPC face tokens owned by **122** (sub-tickets **122.x**) |
| **139** | AI companion face tokens — reuses this pipeline after companions land in **129**; not world-NPC scope |
| **123** (enemy tokens) | Combat creature tokens—not in scope here |

## Out of scope (this epic)

- Enemy / combat creature / map tokens (see epic **123**)
- Full-body character renders
- Player-character portrait generation (see **m001.6** remaining scope)
- AI party companion portraits (see epic **139**; companions onboarding is **129**)
- Scene, region, DM exposition, or player-view background images (**m001.2**–**m001.5**)
- Blocking UI spinners on dossier open or Social row render while images generate
- Manual "regenerate portrait" button (candidate follow-up)
- Requiring local llamacpp for v1 ship criteria

## Sub-tickets

### 122.1 Campaign NPC-image toggle + local-provider defaults

Parent epic: **122** (NPC face-token image generation).

#### Description

Per-campaign setting: generate NPC face tokens (default **OFF**). Document and enforce that local image provider (llamacpp) defaults **OFF**; v1 paths must work with mock/cloud without assuming local LLM painting.

#### Acceptance criteria

- [x] Campaign stores NPC face-token generation enabled flag; default false on create
- [x] Settings UI (or existing campaign settings surface) exposes toggle with clear copy
- [x] Local-provider default OFF is reflected in config/docs; no hard dependency on llamacpp for tests
- [x] Unit tests: toggle OFF prevents enqueue hooks from firing (stubbed)

### 122.2 NPC appearance traits — hair, age, eyes

Parent epic: **122** (NPC face-token image generation).

#### Description

Add `hairColor`, `age`, `eyeColor` for speaking NPCs: DB/schema, NPC create/update paths, dossier Traits display (reuse **105** / Campaign Review labeling patterns).

#### Acceptance criteria

- [x] Schema + migration for appearance fields on speaking NPCs (nullable where appropriate)
- [x] Generation/promote paths can populate fields when available
- [x] Dossier Traits section shows hair, age, eyes with empty states when null
- [x] Unit tests for serialization and dossier DTO inclusion

### 122.3 Face-token generation contract + prompt

Parent epic: **122** (NPC face-token image generation).

#### Description

Typed request/response contract for NPC face-token generation: identity + appearance traits, campaign style hook (stub OK for v1), portrait framing constraints. Prompt builder + mock provider tests per **m001.1**.

#### Acceptance criteria

- [x] Shared typed API for face-token generation (entity id, traits, style context)
- [x] Prompt enforces head/shoulders face token, not full-body
- [x] Mock provider tests cover success and failure payloads
- [x] No direct UI coupling in generation module

### 122.4 Persist token asset on NPC + lifecycle

Parent epic: **122**.

#### Description

Store generated face-token asset reference on the NPC row; load on campaign open; v1 lifecycle (write once on success, stable read).

#### Acceptance criteria

- [x] Successful generation persists asset binding on NPC; survives app restart
- [x] IPC or dossier/social DTOs expose token URL/path when present
- [x] Missing or corrupt asset does not crash consumers; treated as no token
- [x] Unit tests for persist, read, and missing-asset handling

### 122.5 Generation scheduling when toggle ON (async, non-blocking; OFF skips)

#### Description

When campaign toggle is ON, schedule face-token generation after relevant NPC create/update events; async queue per **m001.9** patterns where available. Toggle OFF: no jobs enqueued.

#### Acceptance criteria

- [x] Toggle ON enqueues generation for eligible speaking NPCs without blocking create/play IPC
- [x] Toggle OFF never enqueues; existing NPCs without tokens keep fallbacks
- [x] Failures logged; gameplay state transitions unaffected
- [x] Tests with fake queue/provider assert enqueue/skip behavior

### 122.6 Social avatar uses face token

Update Social stream NPC avatar (`social-avatar`): render stored face token when available; otherwise letter initial in circle (**085** behavior preserved).

#### Acceptance criteria

- [x] Speaking NPC rows show face token image when asset exists
- [x] Fallback to letter initial when no token or load error
- [x] Component tests for token vs initial paths
- [x] No layout shift that blocks reading the stream during async generation

### 122.7 Dossier portrait slot (right of Traits/Facts)

Parent epic: **122** NPC face-token image generation.

#### Description

Fill **105** portrait reserved area: show face token when stored; empty slot when not—no broken-image icon or spinner on open.

#### Acceptance criteria

- [x] Portrait renders in dossier layout right of Traits/Facts per **105** shell
- [x] Empty state when no token (neutral placeholder or blank—no `<img>` error UI)
- [x] Token display uses same asset as Social for consistency
- [x] Component tests: with token, without token, load failure

### 122.8 Tests, smoke, delivery gate

Parent epic: **122**.

#### Description

End-to-end coverage, manual smoke runbook (toggle ON/OFF, Social + dossier), and full delivery gate including **act** CI.

#### Acceptance criteria

- [x] Automated tests cover 122.1–122.7 critical paths
- [x] Runbook: enable toggle, converse/create NPC, verify async token + Social + dossier; OFF verifies fallbacks
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [x] `.github/workflows/pr-checks.yml` and `deadcode.yml` pass via **act**
