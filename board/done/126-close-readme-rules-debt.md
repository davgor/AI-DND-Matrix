# EPIC: Close README rules debt — lockout, grants loop, custom backgrounds, bestiary review

The README and several shipped epics advertise rules and surfaces that are only half-real in play:

| Promise | Reality today |
|---------|----------------|
| **Multi-turn ability/spell lockout** | Tooltips narrate turn cost (`spellDisplay`); engine scaffold was removed as dead code (**061**); README correctly says enforcement is **not wired** |
| **Spell grants** | DM `spellGrants` + `persistSpellGrants` exist (**046**), but the “earn a spell in fiction → feel it in the sheet” loop still needs hardening, player-visible feedback, and smoke confidence |
| **Custom backgrounds** | Roster-only (**050**); personalization is free-text story, not a player-minted background *type* |
| **Bestiary review UI** | Bestiary mechanics shipped (**116**); Campaign Review panel explicitly **deferred** (`src/shared/bestiary/SPEC.md`) |

**NPC opinions of other characters** and the **relationship web** are tracked separately in epic **127** (105 follow-up). **Scene/Social person links** are epic **128** (after **121**).

This epic **officially wires the rules/UI promises above** so advertised mechanics stop feeling like bugs mid-session. Stance: **fiction-first narration is fine; mechanical claims in the README and tooltips must be true.** Prefer small, testable engine/UI closures over new fantasy systems.

Builds on **004** (time-cost intent), **046** / **036** / **047** (known spells), **050** (backgrounds), **116** (bestiary), **061** (truthful README — update again when lockout ships).

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Fiction-first vs half-rules-as-bugs? | **Close the gap.** If the UI/README says “N turn lockout,” the engine enforces it. Deferred Review UI that players expect gets built. |
| Which unfinished rule bites most? | **Turn-lockout** first (casts that should cost tempo currently don’t). Then **spell-grant feedback**, **custom background**, **bestiary review**. |

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Turn-lockout is engine-owned.** After resolving an ability/spell with turn cost `N`, the acting character cannot take an **Action** for `N` subsequent turns (movement still allowed, matching **004.17** intent). Persist lockout state on the character (or encounter participant) so restart mid-combat/session is safe. |
| 2 | **Costs come from catalog / declared ability**, not free LLM numbers. DM/intent may *select* which known spell or ability was used; engine looks up cost and applies lockout. |
| 3 | **Spell grants loop.** Keep validate-against-catalog append to `knownSpellKeys`. Add clear player-facing confirmation when grants land (narration already may say it — sheet/spellbook should reflect immediately; optional toast/log affordance). Smoke + regression tests required. |
| 4 | **Custom background type.** Onboarding allows a **Custom** background: player supplies a short label (and uses the existing story field / generator). Persisted distinctly from roster keys (e.g. `background_key = 'custom'` + `background_custom_label`, or equivalent SPEC). NPCs may keep roster-only (**051**) unless cheap. |
| 5 | **Bestiary Review panel.** Read-only (or light edit per **116.11** stretch) Campaign Review section listing prepped species, lore, variants. Hub may reuse read-only. No new generation UI required beyond what’s already in create. |
| 6 | **No scope creep into mana/slots.** Spells still cost **turns**, not mana (**046** / README). |
| 7 | **README truth.** When lockout ships, update README to state enforcement is live (reverse the **061** caveat). |
| 8 | **Opinions / person links elsewhere.** Multi-subject opinions + relationship web → **127**. Scene/Social name links → **128**. |

## Definition of done

- Casting / using a timed-cost ability applies Action lockout for the correct number of turns; unit + turn-path tests; survives restart
- Spell grants from play reliably appear in spellbook with player-visible confirmation path covered by tests/smoke
- Custom background selectable in onboarding; persisted and visible on sheet / identity context
- Campaign Review shows bestiary panel for campaigns with prepped species
- README lockout sentence updated
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

126.1 SPEC index · 126.2 Turn-lockout engine + persistence · 126.3 Turn-lockout play wiring · 126.4 Spell grants loop harden · 126.5 Custom backgrounds · 126.6 Bestiary Review UI · 126.7 README + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **004.17** / **061** | Restore and wire time-cost lockout for real; README was truthfully downgraded — upgrade when done |
| **046** / **036** / **047** | Known spells + grants + spellbook UI |
| **050** / **051** | Background roster + custom type; NPC roster unchanged unless SPEC says otherwise |
| **116.11** | Promotes deferred bestiary Review panel into delivery |
| **127** | Owns NPC opinions of others + relationship web (was previously mixed into this epic’s draft) |
| **128** | Owns Scene/Social person links |
| **125** | No dependency |
| **131** | Sibling rules honesty: wire combat **conditions** + emergent **homebrew** loop (not lockout) |
| **129** | Companion re-enable — separate from this debt pack |

## Out of scope (v1)

- Spell slots / mana / preparation systems
- Casting from spellbook UI (composer remains the action channel)
- Full mechanical background features (skills, starting gold) — custom is **identity**, not a power budget
- Bestiary authoring studio / live species mint from Review
- Multi-subject opinions / relationship web (**127**)
- Scene/Social person links (**128**)
- Opinions of factions as subjects (use **125** reputation instead)
- Combat condition disadvantage/auto-fail wiring and emergent homebrew honesty (**131**)

## Sub-tickets

### 126.1 SPEC index — rules debt closures

#### Description

Author a short umbrella SPEC (or sectioned SPECs under `src/shared/rulesDebt/` / existing modules) that locks lockout semantics, grant UX expectations, custom background shape, and bestiary Review contract. Point at existing `spells`, `bestiary`, `characterBackground` SPECs rather than duplicating. Point opinion/web and Scene/Social links to **127** / **128**.

#### Acceptance criteria

- [x] Lockout: Action blocked for N turns, movement allowed, persistence field(s) named
- [x] Custom background persistence shape documented
- [x] Explicit non-goals match this epic’s Out of scope (incl. deferrals to 127/128)

### 126.2 Turn-lockout — engine + persistence

#### Description

Reintroduce pure engine helpers for applying and ticking lockout (successor to deleted `timeCostAbility.ts`). Persist remaining Action-lockout turns on character stats or encounter participant state. Unit tests for apply, tick, zero, and “movement still allowed” policy at the rules layer.

#### Acceptance criteria

- [x] `applyTurnLockout` / `tickTurnLockout` (names per SPEC) unit tested for cost N → N ticks clear
- [x] Persistence round-trip tested
- [x] Engine does not trust LLM-supplied lockout durations for catalog spells (lookup cost)

### 126.3 Turn-lockout — play / combat wiring

#### Description

Wire intent + combat/exploration turn resolution so using a known spell/ability with turn cost applies lockout; subsequent Action attempts while locked are rejected or converted per SPEC (clear player feedback). Tick lockout at turn boundaries.

#### Acceptance criteria

- [x] Integration test: cast cost-1 spell → next Action blocked → following turn Actions allowed
- [x] Multi-turn cost (N>1) holds for N Action opportunities
- [x] UI or narration surfaces lockout state at least once (banner, disabled affordance, or DM-visible engine message)

### 126.4 Spell grants loop — harden + feedback

#### Description

Audit `spellGrants` → `persistSpellGrants` → spellbook refresh. Fix gaps (invalid keys, missing sheet invalidation, silent grants). Add player-visible confirmation when ≥1 spell is newly learned. Tests + smoke notes.

#### Acceptance criteria

- [x] Grant of valid catalog key appears in `spellbook:listForCharacter` after the turn
- [x] Invalid keys ignored; no partial corrupt `knownSpellKeys`
- [x] Player-visible feedback path tested or smoke-documented
- [x] Regression test remains green for level-up `spell_access`

### 126.5 Custom backgrounds

#### Description

Extend onboarding background step with **Custom**: player label + story (generate/edit using existing background story agent patterns). Persist without breaking roster keys or **051** NPC reuse.

#### Acceptance criteria

- [x] Custom selectable; label required; story persists
- [x] Sheet / identity context shows custom label
- [x] Roster backgrounds unchanged; migration safe for existing characters
- [x] Component/repo tests for custom vs roster paths

### 126.6 Bestiary Campaign Review panel

#### Description

Implement deferred **116.11**: Review section listing prepped species, base lore, variants (read-only or light edit per SPEC). Hide when roster empty. Optional hub read-only reuse.

#### Acceptance criteria

- [x] Review shows bestiary for campaigns with prepped species
- [x] Empty/legacy campaigns hide or empty-state cleanly
- [x] Component tests with fixture species/variants
- [x] Updates `src/shared/bestiary/SPEC.md` to mark Review panel no longer deferred

### 126.7 README + verification smoke

#### Description

Update README Rules Engine bullet to state lockout is enforced. Cross-cutting smoke notes for lockout, grant, custom background, bestiary Review. Full delivery gate including `act`.

#### Acceptance criteria

- [x] README lockout claim matches shipped behavior
- [x] Smoke notes cover the four closures in this epic (or point at existing runbooks + deltas)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
