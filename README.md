# AI-TTRPG

A single-player, text-adventure-style TTRPG desktop app (Electron + React + TypeScript). Two cooperating AI agents run the game — a **DM agent** that sets scenes, drives the plot, and designs encounters, and **NPC/party-member agents** that roleplay individual characters and enemies. Campaigns are generated from a free-text prompt and then played; world state is durable and causally consistent — if you burn down a village, every later scene remembers it's gone.

Each campaign supports **multiple player characters** in one shared world. After the first character finishes guided creation, re-opening the campaign lands on a **Campaign Hub** (world preview + character cast rail) instead of jumping straight into play.

## Status

**Shipped through epic 039** (see [Roadmap](#roadmap) below). The core loop is playable end-to-end: campaign creation with configurable region/NPC counts, onboarding review, guided character creation, hub-based multi-character management, turn-based play with combat, progression, loot, and packaging.

**Active backlog** (`board/backlog/`):

- **020** — local llama.cpp provider (managed process, adapter, packaged runtime, local-provider smoke parity)

**Still parked** (`board/backlog/revisit/`):

- **021** — consolidated end-to-end smoke test (v1 definition of done; pairs with 020 local parity)

**Exploratory** (`board/backlog/moonshots/`): image generation (m001), host-driven multiplayer (m002), mod-driven homebrew catalog (m003). Not committed delivery scope until promoted to the main backlog.

Ticket workflow and acceptance criteria live under `/board` (`backlog`, `in-progress`, `done`). Smoke runbooks are in `/docs/runbooks`. **Changing campaign creation?** See `docs/runbooks/campaign-create-change-checklist.md` before marking work done.

## Setup

**Running the packaged app** (if someone sent you `AI-TTRPG.exe`, start here):

1. Place a `.env` file in the same folder as the `.exe` (see below for what it needs).
2. Double-click `AI-TTRPG.exe`. It's a portable build — no installer, no admin rights, nothing else to install.

**Configuring a Claude API key** (the default, recommended provider):

1. Get an API key from [console.anthropic.com](https://console.anthropic.com).
2. Create a `.env` file (next to the `.exe` for a packaged build, or at the repo root for a dev checkout) with:
   ```
   AGENT_PROVIDER=claude
   CLAUDE_API_KEY=sk-ant-...
   ```
3. `CLAUDE_MODEL` is optional and defaults to a current Claude model — only set it if you want a specific one.

**Switching providers**: set `AGENT_PROVIDER` in `.env` to the provider name (`claude` or `player2`) — no code changes or rebuild required. `player2` talks to a locally running [Player2](http://127.0.0.1:4315) app over its OpenAI-compatible chat-completions endpoint; no API key needed, just have Player2 running. `PLAYER2_BASE_URL` is optional and defaults to `http://127.0.0.1:4315`.

**Running from source** (for development): `npm install`, then `npm run dev` boots Electron + the React dev server + a dev SQLite file in one command. `npm run package` produces the distributable `.exe` in `release/`.

## Core Design

- **Engine and database are the source of truth.** AI agents read state to produce narration and propose actions; a deterministic rules engine validates and resolves everything (dice, checks, damage, death) before it's persisted. Agents never decide outcomes themselves.
- **Every agent call is re-grounded from SQLite**, never from chat history — this is what makes destroyed regions, dead NPCs, and past choices stick.
- **NPCs have isolated memory.** Each NPC has its own private memory log; it only ever sees its own memories plus world facts explicitly tagged to its region/faction. No NPC can "know" something only another NPC experienced.
- **Provider-agnostic LLM backend.** A pluggable provider interface backs the DM/NPC/party-member agents — Claude (Anthropic Messages API) and [Player2](http://127.0.0.1:4315) (local) are both implemented, swappable via runtime config with no code changes required.
- **Campaign-level world, character-level story.** Regions, NPCs, story threads, events, and `current_state_summary` are shared across all player characters in a campaign. Journal, log book, narration history, party roster ownership, `currentRegionId`, and guided-creation state are per character.

## Tech Stack

- Electron + React + TypeScript
- SQLite (`better-sqlite3`) for persistence, one save per campaign
- Vitest + npm for testing
- oxlint (strict, complexity-aware) for linting
- GitHub Actions: `CI Checks` (test + lint + build) on PRs and pushes to `main`; successful merges to `main` trigger `Deploy`, which bumps the minor version, packages **NSIS installer** (silent auto-update) and **portable `.exe`**, and publishes a GitHub Release with `latest.yml`

## Architecture

```
/src
  /main          Electron main process: frameless window lifecycle, SQLite access, IPC handlers
  /preload       contextBridge-exposed IPC API surface for renderer
  /renderer      React + TS UI:
                   /titlebar        custom draggable titlebar (min/max/close)
                   /sidebar         collapsible campaign list
                   /campaignStart   new-campaign modal (premise, death mode, generation counts)
                   /campaignReview  onboarding world review + generate region/NPC
                   /campaignHub     multi-character hub (world preview + cast rail)
                   /characterSetup  mechanical character creation
                   /guidedCreation  AI-guided identity + opening scene
                   /play            DM narration + player action panels, combat, obituary drafting
                   /characterSheet  stats, inventory, journal, log book
                   /settings        provider configuration (Claude, Player2, llama.cpp scaffold)
  /engine        Pure TS, no Electron/LLM deps: rules engine (checks, combat, dice), world-state model
  /agents        Agent orchestration: dm.ts, npc.ts, partyMember.ts, campaign generation, provider adapters
  /db            SQLite schema, migrations, repository layer
  /shared        Types shared between main/renderer/engine/agents
```

Electron security baseline (from the first scaffold, not retrofitted): `contextIsolation` on, `nodeIntegration` off, `sandbox` on, narrow typed IPC channels only, CSP restricting remote content.

## Rules Engine

A custom, simplified tabletop RPG-inspired ruleset, fully deterministic and unit-tested — agents narrate outcomes, they never invent them.

- **Four abilities**: Body (STR+CON), Agility (DEX), Mind (INT+WIS), Presence (CHA). Modifier = `floor((score-10)/2)`. Score generation: point buy, standard array, or roll-for-stats — player's choice.
- **Core resolution**: `d20 + ability modifier + (proficiency bonus if proficient) vs DC/AC`, with advantage/disadvantage (roll 2d20, take higher/lower). No separate skill list — the DM agent flags an ability + a proficiency boolean per check from context; the engine owns the actual bonus amount.
- **Saves**: all four abilities have a corresponding save. **AC**: `10 + Agility modifier + armor bonus`. **HP**: rolled hit die per level + Body modifier once at level 1; `stats.maxHp` persisted on characters. Villagers default to 10 HP; catalog monsters and retired adventurers use hit-die HP at hydration (catalog `hp` is authoring reference only). **Crits**: natural 20 doubles damage dice.
- **Damage types**: Physical, Fire, Cold, Poison, Arcane, with resistance/vulnerability and weapon enchantment overlays. **Conditions**: Prone, Stunned, Poisoned, Restrained, Unconscious.
- **Inventory/economy**: narrative item list with equipment slots, single currency debited/credited only by the engine, encounter/quest loot tables, prices narrated contextually by the DM agent (engine clamps any proposed price, same guardrail pattern as DC).
- **Combat**: initiative rolled once per encounter (`d20 + Agility`); one Action + Movement per turn; typed combat actions in the same free-text box as exploration. NPCs use catalog or villager/retired-adventurer combat tiers. Flee, surrender, non-lethal victory, and execute defeat are modeled. At 0 HP, characters fall Unconscious and make dying saves — only losing that sequence triggers the campaign's death mode (unless story-driven death is flagged).
- **Death modes** (chosen per campaign): **Legendary** (permanent death + AI obituary), **Standard** (auto-saved snapshot after every resolved action is restored — no explicit player save step; story-driven death can still persist), **Respawn** (world-defined respawn rules mechanically applied: relocate, deduct cost, enforce limits).
- **Progression**: XP awards and agent-assisted level-up perk selection; emergent homebrew detection from tagged play patterns.
- **In-game time**: a simple day counter per campaign — long rest advances it 1 day, travel advances it by a DM-estimated, engine-clamped amount.
- **Abilities/spells cost turns, not mana.** Abilities resolve on use; multi-turn costs are narrated in tooltips but turn-lockout enforcement is not yet wired in the engine.
- **Archetypes & emergent homebrew**: five seed archetypes (Fighter, Rogue, Mage, Cleric, Ranger). Levels 1–20. The engine deterministically detects an emergent direction from repeated tagged events (e.g. a Fighter repeatedly attempting arcane actions crossing a count threshold); only once detected does the DM agent propose flavor for a new feature inside a fixed mechanical template — the engine computes the real numbers, the agent only supplies the fiction.

## Persistence

Each campaign is one SQLite save covering:

- **World (campaign-scoped):** regions (with preseeded `region_history`), NPCs (alignment, temperament, combat stats, yield/surrender state), world facts (explicitly emitted by the DM agent on world-altering narration, not auto-derived), story threads, an append-only event log, `current_state_summary`, and a preseeded TTRPG content catalog.
- **Characters (per player character):** abilities, HP, inventory/equipment, currency, journal, log book, guided-creation phase, `currentRegionId`, narration/turn history, life status (`alive` | `dead`), death cause, persisted obituary JSON, and owned AI party members (`owner_player_character_id`).
- **Recovery:** auto-written save snapshots after every resolved action (Standard-mode combat revert).

Schema changes ship as numbered, forward-only migrations applied automatically on open.

## Roadmap

Work is tracked as epics and sub-tickets under `/board`. Epics move `backlog` → `in-progress` → `done` when every acceptance criterion is checked.

### Completed (001–039)

| Range | Theme |
|-------|--------|
| 001–006 | Scaffold, CI, SQLite, rules engine, Claude + Player2 providers, agent orchestration |
| 007–012 | Campaign generation, sidebar, character creation UI, core play loop, NPC promotion, packaging |
| 014–019 | Startup loading, settings, campaign-start modal, four-column play UI, delete campaign |
| 022–031 | TTRPG terminology scrub, content catalog, items/equipment, log book, guided creation, journal, alignment/temperament, DM turn review, text emphasis, combat encounters |
| 032–037 | Attackable NPCs, flee, surrender/non-lethal outcomes, encounter/quest loot, XP + level-up perks, weapon enchantments |
| 038 | **Campaign hub** — multi-character cast, death/obituaries, per-character party rosters, inactive-character AI proxy, cross-character log-book writes, history-aware region generation, travel to ungenerated destinations |
| 039 | **Configurable generation counts** — region count (0–5) and NPCs per region (0–10) on campaign start; review continue/play gates; per-region generate NPC on review |

### In progress

| Epic | Intent |
|------|--------|
| **046** | **Player spellbook modal** — known spells from catalog, journal tab entry point, DM spell grants; see `src/shared/spells/SPEC.md` and `docs/runbooks/spellbook-smoke-test.md` |

### Active backlog

| Epic | Intent |
|------|--------|
| **020** | Local llama.cpp provider: managed `llama-server` lifecycle, adapter behind the existing provider interface, settings wiring, packaged runtime, and smoke parity across major flows without a cloud API key |

### Revisit backlog

| Epic | Intent |
|------|--------|
| **021** | Single v1 end-to-end smoke matrix covering campaign creation through restart integrity (cloud-provider runbook; pairs with 020's local parity tickets) |

### Moonshots (exploratory)

| Id | Intent |
|----|--------|
| **m001** | Image generation for region/scene backgrounds and character visuals with local/cloud fallback |
| **m002** | Host-driven multiplayer with host-side AI routing and guest party-member identities |
| **m003** | Mod packs that seed homebrew catalog content from structured text files |

See `board/backlog/moonshots/README.md` for promotion rules when a moonshot graduates to the main backlog.

## Development Workflow

- **TDD**: tests are written before implementation for engine, db, and agent context-assembly logic.
- **Ticket board**: see `/board` — text-file tickets (`/board/backlog`, `/board/in-progress`, `/board/done`), each with acceptance criteria that must all be checked before a ticket is done.
- **Agent skills**: the `complete-ticket` workflow lives in `.claude/skills/complete-ticket/SKILL.md` (Claude Code) and `.cursor/skills/complete-ticket/SKILL.md` (Cursor) — keep both in sync.
- **CI**: tests + oxlint + build run on both direct `push` to `main` and `pull_request` targeting `main`. `.github/workflows/pr-checks.yml` defines three jobs — `test`, `lint`, `build`. To enforce this on direct pushes too, create a branch protection rule or ruleset for `main`, enable required status checks, and select `test`, `lint`, and `build` by name.
- **Local dev**: `npm run dev` boots Electron + the React dev server + a dev SQLite file in one command. `npm run package` produces a distributable `.exe`.

## License / Distribution

Personal project, shared as a packaged `.exe` with friends — no public distribution.
