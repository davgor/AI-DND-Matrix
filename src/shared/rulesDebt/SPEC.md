# Rules debt closures — lockout, grants, custom backgrounds, bestiary Review

Umbrella contract for epic **126**. Closes README / tooltip promises that were only half-real in play. Prefer pointers into existing module SPECs over duplicating them.

| Concern | Canonical SPEC / module |
|---------|-------------------------|
| Known spells + grant append | [`spells/SPEC.md`](../spells/SPEC.md) |
| Spell cost (= turn lockout) | Catalog `cost`; display via `spellDisplay` |
| Background roster | `characterBackground` types + engine roster |
| Bestiary species / variants | [`bestiary/SPEC.md`](../bestiary/SPEC.md) |
| Multi-subject opinions / relationship web | Epic **127** (not this epic) |
| Scene / Social person links | Epic **128** (not this epic) |

## Turn lockout (Action)

After a character resolves a known spell/ability with catalog turn cost `N`, they cannot take an **Action** for the next `N` Action opportunities. **Movement remains allowed** (004.17 intent).

### Persistence

Store on the character’s `stats` JSON (same blob as `knownSpellKeys`):

| Field | Type | Meaning |
|-------|------|---------|
| `actionLockoutTurnsRemaining` | `number` (integer ≥ 0) | Action opportunities still blocked. Absent or `0` = free to Act. |

No separate SQL column required for lockout. Survive restart by reading/writing this field with other character stats.

### Engine API (pure)

| Function | Behavior |
|----------|----------|
| `applyTurnLockout(stats, costTurns)` | Sets `actionLockoutTurnsRemaining` to `max(0, floor(costTurns))` from **catalog/lookup**, never from an LLM-supplied duration. |
| `tickTurnLockout(stats)` | Decrements remaining by 1 (floor at 0) once per Action opportunity that has passed while locked (including a blocked Action turn). |
| `isActionLocked(stats)` | `true` when remaining > 0. |
| `canTakeMovementWhileLocked()` | Always `true` — policy helper for callers; movement is never blocked by lockout. |

### Cost authority

1. Intent may select which known spell was used (`usedCatalogSpellKey` on intent).
2. Engine validates the key is in `stats.knownSpellKeys` and looks up `catalog_spells.cost`.
3. That catalog `cost` is the only lockout duration applied for catalog spells.
4. LLM must not invent lockout lengths; ignore any free-form duration fields.

### Play wiring (summary — 126.3)

- Apply lockout after a successful cast/use that consumed an Action with turn cost.
- Reject (or soft-fail with player-visible feedback) subsequent **Action** attempts while `isActionLocked`.
- Tick at Action-opportunity boundaries (combat turn advance / completed exploration Action turn).
- Surface lockout at least once (banner, disabled affordance, or engine message on `TurnResult`).

### Worked example (cost 1)

1. Player casts Firebolt (`cost: 1`) → `applyTurnLockout` → remaining = 1.
2. Next Action attempt → blocked; tick → remaining = 0.
3. Following turn → Actions allowed.

Cost `N > 1` holds for `N` blocked Action opportunities, then clears.

## Spell grants loop

Keep validate-against-catalog append to `stats.knownSpellKeys` ([`spells/SPEC.md`](../spells/SPEC.md)). Hardening (126.4):

- Valid grant keys appear in `spellbook:listForCharacter` after the turn (`refreshToken` already bumps).
- Invalid keys ignored; never corrupt `knownSpellKeys` with unknowns.
- When ≥1 **new** key is learned, expose player-visible confirmation (e.g. `TurnResult` grant narration + status banner), not silent stats-only mutation.
- Level-up `spell_access` path remains unchanged and regression-tested.

## Custom background

Onboarding may choose **Custom** instead of a roster key.

| Field | Persistence |
|-------|-------------|
| `background_key` | Sentinel `'custom'` (not a roster `BACKGROUND_KEYS` entry) |
| `background_custom_label` | Required short player label (new column on `characters`; null for roster backgrounds) |
| `background_story` | Existing story text (generate/edit via current background-story agents) |

Display: sheet / identity context shows `background_custom_label` when key is `custom`; roster keys keep `resolveBackgroundDisplayLabel` / roster labels.

NPCs stay roster-only (**051**) unless a later ticket opts in. Custom is **identity only** — no mechanical features, skills, or starting-gold budget.

## Bestiary Campaign Review panel

Promotes deferred **116.11**: Campaign Review lists prepped species (name, base lore, variants) read-only. Hide the section (or show a clean empty state) when the campaign has no species. Optional hub read-only reuse is allowed; no new generation UI beyond create-time prep. Update [`bestiary/SPEC.md`](../bestiary/SPEC.md) when the panel ships so Review is no longer marked deferred.

## Non-goals (v1)

Match epic **126** Out of scope:

- Spell slots / mana / preparation systems
- Casting from the spellbook UI (composer remains the action channel)
- Full mechanical background features (skills, starting gold)
- Bestiary authoring studio / live species mint from Review
- Multi-subject opinions / relationship web (**127**)
- Scene / Social person links (**128**)
- Opinions of factions as subjects (**125** reputation)
- Combat condition disadvantage/auto-fail wiring and emergent homebrew honesty — see [`rulesHonesty/SPEC.md`](../rulesHonesty/SPEC.md) (**131**)
- Formulaic “extra turns spent” magnitude scaling from early **004.17** drafts — v1 lockout uses catalog `cost` only
