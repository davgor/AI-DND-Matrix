# EPIC: Build the rules engine

Broken down into sub-tickets 004.1-004.24. This epic is done when all of them are.

004.1 ability mod + point buy · 004.2 standard array · 004.3 roll-for-stats · 004.4 core check resolution · 004.5 proficiency bonus scaling · 004.6 saving throws · 004.7 AC formula · 004.8 HP-per-level · 004.9 critical hits · 004.10 damage types/resistance · 004.11 conditions · 004.12 initiative/turn structure · 004.13 0 HP dying sequence · 004.14 death mode: Legendary · 004.15 death mode: Standard · 004.16 death mode: Respawn · 004.17 time-cost abilities · 004.18 rest resolution · 004.19 travel time advance · 004.20 XP/leveling · 004.21 currency debit/credit · 004.22 emergent-direction detection · 004.23 archetype feature templates · 004.24 import-boundary test

## Sub-tickets

### 004.1 Ability modifier function + point buy score generation

#### Description
Implement the ability modifier formula and the point-buy score-generation method for the four abilities (Body, Agility, Mind, Presence).

#### Acceptance Criteria
- [x] `abilityModifier(score)` returns `floor((score-10)/2)`, unit tested across scores 1-20
- [x] Point-buy generation enforces a fixed point pool and a min/max per-ability range; allocations exceeding the pool or range are rejected
- [x] A test confirms a valid point-buy allocation sums correctly and an invalid one (over pool, out of range) is rejected

### 004.2 Standard array score generation

#### Description
Implement the standard-array score-generation method.

#### Acceptance Criteria
- [x] A fixed array (e.g. 15,14,13,12) is exposed for assignment to the four abilities
- [x] Each array value can be assigned to exactly one ability; duplicate assignment of the same value to two abilities is rejected
- [x] Test covers a valid full assignment and a rejected duplicate-assignment attempt

### 004.3 Roll-for-stats score generation

#### Description
Implement the 4d6-drop-lowest roll-for-stats generation method with a seedable RNG so it's deterministic in tests.

#### Acceptance Criteria
- [x] Rolling uses 4d6, drops the lowest die, sums the remaining three
- [x] The RNG is injectable/seedable; the same seed always produces the same four scores
- [x] Test confirms output scores fall within the valid 3-18 range per ability

### 004.4 Core d20 check resolution + advantage/disadvantage

#### Description
Implement the core check formula: d20 + ability modifier + proficiency bonus (if proficient) vs DC, with advantage/disadvantage support.

#### Acceptance Criteria
- [x] `resolveCheck(...)` returns pass/fail correctly at and around the DC boundary (DC equal to roll = pass)
- [x] Advantage rolls 2d20 and takes the higher; disadvantage rolls 2d20 and takes the lower — both unit tested with a seeded RNG
- [x] Proficiency bonus is added only when a proficient flag is true, unit tested both ways

### 004.5 Proficiency bonus scaling by level

#### Description
Implement the centralized proficiency bonus curve (e.g. +2 at level 1, increasing every few levels) as a pure function of level.

#### Acceptance Criteria
- [x] `proficiencyBonus(level)` is defined once and used by all check/save resolution — not a parameter callers can override
- [x] Unit tested at the level boundaries where the bonus increases (e.g. levels 1, 4/5, 8/9, etc. per the chosen curve)

### 004.6 Saving throw resolution

#### Description
Implement saving throws for all four abilities using the same core mechanics as checks.

#### Acceptance Criteria
- [x] `resolveSave(ability, ...)` works identically to `resolveCheck` for all four abilities (Body, Agility, Mind, Presence)
- [x] Unit tested for at least one save per ability, covering pass and fail

### 004.7 AC formula

#### Description
Implement Armor Class: 10 + Agility modifier + equipped armor bonus, across armor tiers.

#### Acceptance Criteria
- [x] `computeAC(agilityScore, armorTier)` implements the formula for at least none/light/medium/heavy tiers
- [x] Unit tested for each tier with varying Agility scores

### 004.8 HP-per-level formula

#### Description
Implement HP accumulation per level: archetype hit die (fixed average, not rolled) + Body modifier, accumulated across levels.

#### Acceptance Criteria
- [x] `computeHP(archetype, level, bodyScore)` is deterministic (no RNG) and accumulates correctly across levels
- [x] Unit tested for at least 2 distinct archetypes (different hit die sizes) across several levels

### 004.9 Critical hit rule

#### Description
Implement the critical hit rule: a natural 20 on an attack roll doubles the damage dice rolled, not the modifier.

#### Acceptance Criteria
- [x] Attack resolution detects a natural 20 and doubles only the dice portion of damage, leaving the flat modifier unchanged
- [x] Unit tested comparing a normal hit's damage to a crit's damage for the same attack

### 004.10 Damage types + resistance/vulnerability

#### Description
Implement the five damage types (Physical, Fire, Cold, Poison, Arcane) and resistance/vulnerability multipliers.

#### Acceptance Criteria
- [x] Damage resolution accepts a damage type and applies a target's resistance (half damage) or vulnerability (double damage) multiplier when present
- [x] Unit tested for at least Physical (no modifier), Fire (resisted case), and Poison (vulnerable case)

### 004.11 Conditions: mechanical effects

#### Description
Implement the five conditions (Prone, Stunned, Poisoned, Restrained, Unconscious), each with its fixed mechanical effect.

#### Acceptance Criteria
- [x] Each condition's effect is defined once centrally (e.g. Restrained = disadvantage on Agility checks/saves)
- [x] Each of the five conditions has at least one unit test confirming its effect is applied to a check/save/action when active

### 004.12 Initiative + turn structure

#### Description
Implement combat initiative (rolled once per encounter, d20 + Agility) and the Action + Movement per-turn structure.

#### Acceptance Criteria
- [x] Initiative is rolled once per combatant at encounter start and the resulting order holds for the whole encounter, unit tested
- [x] Turn structure enforces exactly one Action plus movement per turn; attempting a second Action in the same turn is rejected

### 004.13 0 HP dying-save sequence

#### Description
Implement the Unconscious + dying-save sequence triggered at 0 HP, independent of death mode.

#### Acceptance Criteria
- [x] Reaching 0 HP marks the character Unconscious and starts a dying-save sequence
- [x] A streak of save successes stabilizes the character (no longer dying), unit tested
- [x] A streak of save failures marks the sequence as lost, unit tested
- [x] The sequence never directly triggers death_mode resolution itself — that is a separate step (see 004.14-16)

### 004.14 Death mode execution: Legendary

#### Description
Implement Legendary death-mode resolution: a lost dying-save sequence permanently marks the character dead.

#### Acceptance Criteria
- [x] Given a lost dying sequence and `death_mode = legendary`, the character is marked permanently dead
- [x] Unit tested that no further action can revive the character once marked dead under this mode

### 004.15 Death mode execution: Standard

#### Description
Implement Standard death-mode resolution: restore the most recent `saves` snapshot on a lost dying sequence.

#### Acceptance Criteria
- [x] Given a lost dying sequence and `death_mode = standard`, the most recent saves snapshot is restored
- [x] Unit tested that the restored state matches the pre-fatal-action snapshot, not any state after it

### 004.16 Death mode execution: Respawn

#### Description
Implement Respawn death-mode resolution: relocate, deduct cost, and enforce limits per the campaign's respawn_rules.

#### Acceptance Criteria
- [x] Given a lost dying sequence and `death_mode = respawn`, the character is relocated to `respawn_rules.location`
- [x] The configured `respawn_rules.cost` is deducted from the character's currency
- [x] A remaining-uses counter is decremented when `respawn_rules.limits` defines a limit; exhausting it falls back to Legendary behavior on the next death, unit tested

### 004.17 Time-cost ability resolution + formulaic scaling

#### Description
Implement the time-cost ability/spell model: effect resolves immediately, turn-lockout cost applies afterward, scaling is formulaic per extra turn spent.

#### Acceptance Criteria
- [x] Declaring an ability with N extra turns spent resolves its effect immediately at the scaled magnitude
- [x] The character is locked out of taking an Action (movement still allowed) for exactly N subsequent turns
- [x] Formulaic scaling unit tested: a 2-turn cost produces the expected multiplier/bonus over the 0-turn base effect, consistently across different base abilities

### 004.18 Rest resolution (short/long) + in-game date

#### Description
Implement short rest (partial HP recovery) and long rest (full HP recovery); long rest also advances the campaign's in-game date by 1 day.

#### Acceptance Criteria
- [x] Short rest recovers a partial, defined amount of HP, unit tested
- [x] Long rest recovers full HP, unit tested
- [x] Long rest resolution returns an in-game-date advance of 1 day alongside the HP change

### 004.19 Travel resolution: in-game date advance

#### Description
Implement travel-time resolution: advances the campaign's in-game date by a DM-estimated number of days, clamped to a sane range by the engine.

#### Acceptance Criteria
- [x] `resolveTravel(estimatedDays)` clamps the input to a defined sane range (e.g. 0-30 days) before returning the actual advance
- [x] Unit tested for a normal value (passes through), a too-large value (clamped down), and a negative value (rejected or clamped to 0)

### 004.20 XP awarding + level-up threshold crossing

#### Description
Implement XP awarding and level-up threshold detection.

#### Acceptance Criteria
- [x] `awardXP(character, amount)` adds XP and returns whether a level-up threshold was crossed
- [x] Level thresholds are defined centrally (not caller-supplied), unit tested at a couple of threshold boundaries
- [x] Crossing multiple thresholds in one award (e.g. a big XP grant) is handled correctly (multiple level-ups or capped at one — pick one behavior and test it explicitly)

### 004.21 Currency debit/credit functions

#### Description
Implement the engine-level currency debit/credit rules that the agent-facing shop interactions use.

#### Acceptance Criteria
- [x] `creditCurrency(character, amount)` and `debitCurrency(character, amount)` are pure functions returning new state + success/failure
- [x] Debiting more than the current balance is rejected with an explicit insufficient-funds result, never silently clamped to zero
- [x] Unit tested for a valid credit, a valid debit, and a rejected over-debit

### 004.22 Emergent-direction detection

#### Description
Implement the pure function that scans a character's recent tagged events for a repeated-tag pattern outside their archetype's normal kit, returning a detected-direction candidate once a count threshold is crossed.

#### Acceptance Criteria
- [x] `detectEmergentDirection(character, recentEvents)` returns a candidate object when a tag's count among recent events crosses a fixed threshold
- [x] Returns `null`/no-result when no tag crosses the threshold
- [x] Unit tested for both the under-threshold and over-threshold cases with seeded event data

### 004.23 Archetype feature-template number computation

#### Description
Implement the template system that computes concrete feature numbers (e.g. effect dice) from a level and a fixed template, independent of any agent-supplied flavor text.

#### Acceptance Criteria
- [x] `computeFeatureFromTemplate(template, level)` is deterministic — same template+level always yields the same numbers
- [x] Unit tested across at least 3 different levels for one template, confirming numbers scale as the template defines
- [x] The function signature has no parameter for agent-supplied numeric values — only flavor/text fields are accepted alongside the template+level inputs

### 004.24 Engine import-boundary test

#### Description
Prove `/engine` has zero dependency on Electron, a DB client, or an LLM provider, since it must remain pure and independently testable.

#### Acceptance Criteria
- [x] A test or lint rule scans `/engine` source files and fails if any import references Electron, `better-sqlite3`, or an agent/provider module
- [x] The check runs as part of `npm test` or `npm run lint` so it can't silently regress
