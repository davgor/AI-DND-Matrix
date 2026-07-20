# Ask the DM — out-of-character chat (Epic 106)

Companion to [`PLAY_VIEW_UX_SPEC.md`](./PLAY_VIEW_UX_SPEC.md). Defines the OOC player ↔ DM channel: entry point, panel UX, tone, persistence, and hard isolation from the turn pipeline.

## Purpose

While playing, the human player can ask the DM **as a player** (rules clarifications, name reminders, table talk, session preferences) without acting in character or advancing the fiction.

**OOC ≠ Act.** Social “Act” stays in-character and always goes through `turn:resolve` → `resolvePlayerTurn`. Ask the DM never shares that path.

## Entry point

| Control | Location |
|---------|----------|
| **Ask the DM** | Play sheet **Journal** tab → `.play-sheet-journal-actions`, **immediately under** “Open spellbook” |

Not placed in `PlaySessionChrome` (Recap / rolls / Hub row). Journal tab remains available in exploration and combat, so the panel is reachable mid-combat.

Button uses the existing `play-sheet-action-button` pattern (`playSheetRail.css`).

## Panel UX

**Chrome:** full-screen modal overlay (same pattern as Spellbook / journal notes / Recap dialog):

- `ModalPortal` → backdrop with `modal-overlay` + panel with `modal-panel`
- Dismiss: × button, **Escape**, click backdrop
- Contents: clear **Out of character** labeling, scrollable transcript (player vs DM roles), composer, loading and error states

Visually distinct from Scene/Social columns — eyebrow/title must say Ask the DM / OOC so it cannot be mistaken for in-character Social chat.

## Overlay z-index stack (relative)

Ask the DM uses the shared play-modal layer (`.modal-overlay` → **z-index 200**), same as Spellbook and Recap dialog. It stacks with those peers (last opened wins visually). It stays **below** level-up (**1000**) and obituary drafting (**1100**). Recap/promotion inline banners remain at **10** and do not trap focus above Ask the DM.

| Layer | z-index | Notes |
|-------|---------|-------|
| Recap / promotion banners | 10 | Inline session chrome |
| Overlay backdrop / rails (layout) | 15–30 | See play UX spec |
| Ask the DM / Spellbook / Recap dialog / journal notes | **200** | `.modal-overlay` |
| Level-up modal | 1000 | Above play modals |
| Obituary drafting | 1100 | Above level-up |

## OOC tone

| Role | Speaks as | Does |
|------|-----------|------|
| Player | Human player (not the character) | Asks rules, reminders, meta questions |
| DM | Table facilitator | Clarifies rules, recalls known facts, table talk |

The DM must **not** narrate as if the character spoke, invent scene events, or write fiction that belongs in Scene/Social.

## Hard isolation (non-negotiable)

OOC send **never**:

- Invokes `turn:resolve` / `resolvePlayerTurn` / `executeResolvedPlayerTurn`
- Runs intent/routing beats or narration side-effect persistence (`persistNarrationSideEffects`)
- Appends Scene or Social play-log projections
- Advances combat, rest, travel, item-mod, XP, or world state
- Creates `player_action` / IC DM narration / combat-advance events
- Forces a turn save snapshot

In-character Social “Act” is unchanged and still uses `turn:resolve`.

Isolation is enforced by a dedicated IPC module (`askDm:*`) registered outside `turnIpc`, plus automated tests (106.5). See comment near `askDmIpc` registration.

## Persistence (locked for 106.3)

| Decision | Choice |
|----------|--------|
| Shape | Dedicated table `ask_dm_messages` (guided-creation-messages style) |
| Scope | **Per active character** (`campaign_id` + `character_id`) — one OOC thread per character |
| Roles | `player` \| `dm` |
| Scene/Social | OOC rows are **not** campaign `events`. They never enter `eventToLogEntries` / `buildNarrationLog` / `filterDmExpositionEntries` / `filterSocialEntries` |
| Recap | Recap continues to read `events` only — OOC messages are excluded by construction |

Do **not** store OOC as an `events` type. Unknown event types already project to `[]`, but a dedicated table keeps recap grounding and fiction audit trails clean without special-case filters.

## Grounding for DM replies (locked for 106.4)

Slim context only:

1. Campaign name / short `current_state_summary` (if present)
2. Active character name (and class/level if cheap)
3. Optional recent IC Scene/Social lines (small cap) for “what was that NPC’s name?” style reminders

Rules/meta answers may use general tabletop knowledge. The agent must not invent new scene events or mutate world state. Token cap documented on the agent module (epic 040.1 style).

## Non-goals

- Changing Social composer / `turn:resolve` for in-character actions
- In-character “whisper to DM” that advances the scene
- Multiplayer / multi-seat OOC
- Replacing Recap, journal notes, spellbook, or guided creation
- Ask the DM on `PlaySessionChrome`
- Gameplay mechanics triggered from OOC chat

## Smoke path (106.6)

1. Enter play → Journal tab → **Ask the DM** (under Open spellbook)
2. Send an OOC question → receive DM facilitator reply
3. Confirm Scene/Social/turn state unchanged; combat (if active) not advanced
4. Close campaign and reopen → OOC history still present for that character
