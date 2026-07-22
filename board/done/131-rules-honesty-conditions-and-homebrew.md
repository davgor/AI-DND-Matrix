# EPIC: Rules honesty — wire combat conditions + close emergent homebrew

Epic **126** closes advertised **turn-lockout**, spell-grant feedback, custom backgrounds, and bestiary Review. The README still lists **conditions** (Prone, Stunned, Poisoned, Restrained, Unconscious) as real combat rules, but production use is essentially `canAct` — disadvantage / auto-fail helpers from `CONDITION_EFFECTS` are not applied in check/attack math (**061** pruned dead consumers). Separately, **emergent homebrew** is sold as play-pattern → new features, while dedicated DM flavor proposal was removed and detection only feeds level-up context.

This epic finishes **rules honesty** for those two promises: either make them true in the engine, or stop advertising them. Stance matches **126**: fiction-first narration is fine; mechanical claims must be true.

Builds on **004** / `conditions.ts`, combat resolvers, **036** level-up / `detectEmergentDirection`, **061**, **126** (sibling — do not duplicate lockout work).

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Conditions: implement or delete README? | **Implement** the table already in `CONDITION_EFFECTS` for checks/attacks/saves that the engine resolves. |
| Homebrew: full feature factory or honest downgrade? | **Honest loop:** keep detection → surface at level-up with engine-clamped template numbers; restore a **small** flavor-fill path only if needed so players see a named feature — or rewrite README if flavor remains prompt-only. SPEC picks one and README must match. |

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Condition effects are engine-owned.** When a participant has conditions, attack rolls, ability checks, and saves apply disadvantage / auto-fail / preventsActions per `CONDITION_EFFECTS` (and existing `canAct`). |
| 2 | **Apply at resolution sites** the engine already owns (combat attack, checks, dying/saves as applicable) — not via LLM inventing modifiers. |
| 3 | **UI truth.** Sheet/combat rail showing conditions must match mechanical application (or show “flavor only” — not allowed once wired). |
| 4 | **Emergent homebrew.** SPEC documents the shipped loop end-to-end (detect → level-up offer → persist feature inside template). If `proposeHomebrewFlavor` stays deleted, level-up prompts + README must not claim a separate agentic flavor service. |
| 5 | **No new condition types** in v1 beyond the existing enum unless trivial. |
| 6 | **126 remains owner of lockout**; this epic does not re-open lockout scope. |

## Definition of done

- Unit tests prove prone/poisoned/stunned/restrained/unconscious affect rolls/actions per table
- Combat/check integration path applies conditions
- Emergent homebrew loop matches README (implement or rewrite)
- README conditions + homebrew bullets accurate
- Delivery gate including `act`

131.1 SPEC · 131.2 Engine apply helpers · 131.3 Wire combat/checks · 131.4 Homebrew loop honesty · 131.5 README + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **126** | Sibling rules-debt; lockout stays there |
| **004** | Conditions module source of truth |
| **036** | Level-up / emergent detection |
| **061** | Reintroduce only what is tested and called |

## Out of scope (v1)

- Turn-lockout (**126**)
- Spell slots / mana
- New condition enum sprawl
- Full homebrew workshop UI / player-authored mechanics outside templates

## Sub-tickets

### 131.1 SPEC — conditions + homebrew honesty

#### Description

Document which resolution APIs apply which `ConditionEffect` fields; document emergent homebrew end state and README wording.

#### Acceptance criteria

- [x] SPEC maps each condition → mechanical effect at named call sites
- [x] SPEC locks homebrew player-visible loop
- [x] Non-goals explicit

### 131.2 Engine — apply condition effects

#### Description

Pure helpers (or restore pruned ones) that wrap d20/check/attack inputs with disadvantage/auto-fail given condition lists. TDD-first.

#### Acceptance criteria

- [x] Unit tests for each condition’s table row
- [x] `canAct` remains authoritative for preventsActions
- [x] No Electron/DB imports in `/engine`

### 131.3 Wire combat and check resolution

#### Description

Call helpers from combat attack resolution and ability-check paths so sheet-visible conditions change outcomes.

#### Acceptance criteria

- [x] Integration test: poisoned attacker has disadvantage (or equivalent) on attacks
- [x] Stunned/unconscious cannot take Actions (existing + reinforced)
- [x] UI still displays active conditions

### 131.4 Emergent homebrew loop

#### Description

Audit `detectEmergentDirection` → level-up offer → persist. Restore minimal flavor fill **or** strip over-claims. Tests for detect → offer path.

#### Acceptance criteria

- [x] Automated test covers detection influencing a level-up offer payload
- [x] README homebrew paragraph matches code
- [x] Failure of flavor LLM never blocks engine level-up numbers

### 131.5 README + smoke

#### Description

Update README Rules Engine bullets; smoke notes for condition effect + homebrew offer. Full delivery gate including `act`.

#### Acceptance criteria

- [x] README conditions claim is true
- [x] Smoke notes or runbook deltas exist
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
