# EPIC: AI companion face-token image generation

Spun out of **129.5**. Epic **129** ships prompt-generated companions (onboarding phase, generate/accept, orders, gear, flee-follow) **without** requiring the image pipeline. This epic owns **face-token portraits for `ai_party_member` companions** once NPC face tokens (**122**) and shared pipeline primitives (**m001.1** / **m001.6**) exist.

## Target UX

```
Campaign / shared image toggle ON
  └── On companion Accept (or later regenerate policy)
        │
        ▼
  Enqueue face-token job (entity kind = ai_party_member)
        │
        ├── success → persist asset on companion; Social + roster/sheet avatar
        └── failure/skip → letter-initial fallback; never blocks play or onboarding
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Depends on **122** / m001.1** — reuse NPC face-token contract; do not fork a second image stack. |
| 2 | **Entity kind** `ai_party_member` (not world NPC). Appearance traits from companion generation feed the prompt. |
| 3 | **Non-blocking.** Accept → identity (129) and play never wait on images. |
| 4 | **Toggle OFF → no enqueue.** Same campaign/shared toggle pattern as **122**. |
| 5 | **Surfaces:** Social party lines + roster/sheet avatar; letter-initial fallback. |
| 6 | **No companion dossiers** required — avatar surfaces only. |

## Definition of done

- Toggle OFF → no enqueue; Toggle ON → async job; asset persists; survives restart
- Social/roster prefer token when present
- Accept / play paths work even if image provider throws
- Mock image provider tests for companion entity type
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

139.1 Wire enqueue on companion Accept · 139.2 Persist + lifecycle · 139.3 Social/roster surfaces · 139.4 Failure + toggle tests · 139.5 Docs + delivery gate

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **129** | Creates companions + appearance traits; this epic paints them |
| **122** | NPC face-token pipeline / toggle / Social patterns to reuse |
| **m001.1** / **m001.6** | Shared image provider + character visual pipeline |
| **123** | Enemy tokens — not companions |

## Out of scope (v1)

- Blocking onboarding or play on image completion
- Full-body / combat map tokens for companions
- Companion dossier modal portraits
- Scene/background generation

## Sub-tickets

### 139.1 Enqueue on Accept (reuse 122 contract)

#### Description

When image toggle is ON and a companion is accepted (or equivalent persist path from **129**), enqueue a face-token job with entity kind `ai_party_member` and appearance traits.

#### Acceptance criteria

- [ ] Toggle OFF → no enqueue
- [ ] Toggle ON → async enqueue with companion entity type
- [ ] Unit tests with mock image provider

### 139.2 Persist asset + lifecycle

#### Description

Store generated face-token reference on the companion row (or shared asset table); load on campaign open; stable read until replace policy.

#### Acceptance criteria

- [ ] Asset persists and survives restart
- [ ] Repo/unit tests for write + read

### 139.3 Social + roster/sheet surfaces

#### Description

Prefer stored face token on Social party lines and roster/sheet avatars; letter-initial fallback when missing.

#### Acceptance criteria

- [ ] Component tests: token present vs fallback
- [ ] No broken-image placeholders

### 139.4 Failure never blocks

#### Description

Image provider throw / timeout does not block Accept→identity or play turns.

#### Acceptance criteria

- [ ] Integration/unit test: provider throws → phase/play continues
- [ ] Fallback avatar still renders

### 139.5 Docs + delivery gate

#### Description

Cross-link README / **129** / **122**; full delivery gate including `act`.

#### Acceptance criteria

- [ ] Docs note companion tokens are this epic, not **129** DoD
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
