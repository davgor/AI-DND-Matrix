# AI-TTRPG

A single-player, text-adventure-style TTRPG desktop app (Electron + React + TypeScript). Two cooperating AI agents run the game — a **DM agent** that sets scenes, drives the plot, and designs encounters, and **NPC/party-member agents** that roleplay individual characters and enemies. Campaigns are generated from a free-text prompt and then played; world state is durable and causally consistent — if you burn down a village, every later scene remembers it's gone.

Each campaign supports **multiple player characters** in one shared world. After the first character finishes guided creation, re-opening the campaign lands on a **Campaign Hub** (world preview + character cast rail) instead of jumping straight into play. New characters follow a layered onboarding path: mechanical setup → race → background → starting equipment → AI-guided identity → opening scene → enter world.

## Status

**Shipped through epic 108** (see [Roadmap](#roadmap) below). The core loop is playable end-to-end: cascading campaign creation (pantheon, world, regions, NPCs, story), onboarding review, race/background/equipment selection, guided identity and opening scene, hub-based multi-character management, turn-based play with Social/Scene streaming, combat, quests, spellbook, progression, loot, and packaging with auto-update.

**In progress** (`board/in-progress/`):

- **100** — hide AI Party Members section on character setup (temporary UI follow-up to 099)

**Active backlog** (`board/backlog/`):

- **020** — local llama.cpp provider (managed process, adapter, packaged runtime, local-provider smoke parity)
- **105** — NPC dossier modal (Social/log-book entry → traits, facts, opinion, disposition)
- **106** — Ask the DM OOC chat (session-chrome panel; never hits the turn pipeline)
- **112** — LLM usage metering (tokens/cost by purpose for subscription modeling)
- **113** — Multi-cloud provider settings (Claude / GPT / Gemini / Grok dropdown + model picker)

**Still parked** (`board/backlog/revisit/`):

- **021** — consolidated end-to-end smoke test (v1 definition of done; pairs with 020 local parity)

**Exploratory** (`board/backlog/moonshots/`): image generation (m001), host-driven multiplayer (m002), mod-driven homebrew catalog (m003), pixel/sprite grid campaign type (m004), remote play via PC local providers (m005). Not committed delivery scope until promoted to the main backlog.

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
- **Every agent call is re-grounded from SQLite**, never from chat history — this is what makes destroyed regions, dead NPCs, and past choices stick. Context assembly is slimmed for token cost (epic **040**); semantic RAG over the save selects relevant lore within a hard injection cap (epic **083**).
- **NPCs have isolated memory.** Each NPC has its own private memory log; it only ever sees its own memories plus world facts explicitly tagged to its region/faction. No NPC can "know" something only another NPC experienced. Speaking style and selective replies keep Social chatter on-character without every NPC answering every line.
- **Provider-agnostic LLM backend.** A pluggable provider interface backs the DM/NPC/party-member agents — Claude (Anthropic Messages API) and [Player2](http://127.0.0.1:4315) (local) are both implemented, swappable via runtime config with no code changes required. Local llama.cpp is backlog (**020**).
- **Campaign-level world, character-level story.** World name/summary/history, pantheon, regions, NPCs, story threads, events, and `current_state_summary` are shared across all player characters in a campaign. Journal, log book, quest log, known spells, narration/turn history, party roster ownership, `currentRegionId`, and guided-creation state are per character.
- **Social vs Scene.** Play UI separates a Social stream (player and NPC dialogue, streaming window) from DM Scene exposition so conversation and narration stay readable and independently projected.

## Tech Stack

- Electron + React + TypeScript
- SQLite (`better-sqlite3`) for persistence, one save per campaign
- Vitest + npm for testing (CI shards the suite dynamically for wall-clock ~1m; local `npm test` stays a full unsharded run)
- oxlint (strict, complexity-aware) for linting
- `ts-prune` deadcode gate (`npm run deadcode` vs `.tsprune-ignore`) as a delivery/CI check alongside test, lint, and build
- GitHub Actions: `CI Checks` (sharded test + lint + build) on PRs and pushes to `main`; successful merges to `main` trigger `Deploy`, which bumps the minor version, packages **NSIS installer** (silent auto-update), **portable `.exe`**, and **mac `.dmg`**, and publishes a GitHub Release with `latest.yml`

## Architecture

```
/src
  /main          Electron main process: frameless window lifecycle, SQLite access, IPC handlers
  /preload       contextBridge-exposed IPC API surface for renderer
  /renderer      React + TS UI:
                   /titlebar        custom draggable titlebar (min/max/close)
                   /sidebar         collapsible campaign list
                   /campaignStart   new-campaign modal (premise, death mode, generation counts)
                   /campaignReview  onboarding world/pantheon/region review + generate/regenerate
                   /campaignHub     multi-character hub (world preview + cast rail)
                   /characterSetup  mechanical character creation
                   /raceSelection   campaign-scoped race + lore
                   /backgroundSelection  background roster + personal story
                   /equipmentSelection   archetype starting loadouts + starter spells
                   /guidedCreation  AI-guided identity + opening scene
                   /playView        Scene + Social columns, combat, session chrome, obituary drafting
                   /characterSheet  overlay: stats, equipment, journal, log book, quest log, spellbook
                   /settings        provider configuration (Claude, Player2, llama.cpp scaffold)
                   /autoUpdate      update banner / ready copy
  /engine        Pure TS, no Electron/LLM deps: rules engine (checks, combat, dice), world-state model
  /agents        Agent orchestration: dm.ts, npc.ts, partyMember.ts, cascading campaign generation, provider adapters
  /db            SQLite schema, migrations, repository layer
  /shared        Types shared between main/renderer/engine/agents
```

Electron security baseline (from the first scaffold, not retrofitted): `contextIsolation` on, `nodeIntegration` off, `sandbox` on, narrow typed IPC channels only, CSP restricting remote content.

## Rules Engine

A custom, simplified tabletop RPG-inspired ruleset, fully deterministic and unit-tested — agents narrate outcomes, they never invent them.

- **Four abilities**: Body (STR+CON), Agility (DEX), Mind (INT+WIS), Presence (CHA). Modifier = `floor((score-10)/2)`. Score generation: point buy (**12**-point pool, scores **8–20**), standard array (**14 / 12 / 10 / 8**, unique assignment), or roll-for-stats — player's choice.
- **Core resolution**: `d20 + ability modifier + (proficiency bonus if proficient) vs DC/AC`, with advantage/disadvantage (roll 2d20, take higher/lower). No separate skill list — the DM agent flags an ability + a proficiency boolean per check from context; the engine owns the actual bonus amount.
- **Saves**: all four abilities have a corresponding save. **AC**: `10 + Agility modifier + armor bonus`. **HP**: rolled hit die per level + Body modifier once at level 1 (`stats.maxHp` persisted); villagers default to 10 HP; catalog monsters and retired adventurers use hit-die HP at hydration (catalog `hp` is authoring reference only). **Crits**: natural 20 doubles damage dice.
- **Damage types**: Physical, Fire, Cold, Poison, Arcane, with resistance/vulnerability and weapon enchantment overlays. **Conditions**: Prone, Stunned, Poisoned, Restrained, Unconscious.
- **Inventory/economy**: narrative item list with equipment slots (including main hand / off hand / shield / accessories), single currency debited/credited only by the engine, encounter/quest loot tables, prices narrated contextually by the DM agent (engine clamps any proposed price, same guardrail pattern as DC). Starting gear is chosen from archetype loadouts before guided identity.
- **Combat**: initiative rolled once per encounter (`d20 + Agility`); one Action + Movement per turn; typed combat actions in the same free-text box as exploration. NPCs use catalog or villager/retired-adventurer combat tiers. Flee, surrender, non-lethal victory, and execute defeat are modeled. At 0 HP, characters fall Unconscious and make dying saves — only losing that sequence triggers the campaign's death mode (unless story-driven death is flagged).
- **Death modes** (chosen per campaign): **Legendary** (permanent death + AI obituary), **Standard** (auto-saved snapshot after every resolved action is restored — no explicit player save step; story-driven death can still persist), **Respawn** (world-defined respawn rules mechanically applied: relocate, deduct cost, enforce limits).
- **Progression**: difficulty-rated XP (LLM rates `easy`–`impossible`; engine applies a fixed fraction of the level span) and agent-assisted level-up perk selection; emergent homebrew detection from tagged play patterns. Known spells live in `stats.knownSpellKeys` and surface in the player spellbook.
- **In-game time**: a simple day counter per campaign — long rest advances it 1 day, travel advances it by a DM-estimated, engine-clamped amount.
- **Abilities/spells cost turns, not mana.** Abilities resolve on use; multi-turn costs are narrated in tooltips but turn-lockout enforcement is not yet wired in the engine.
- **Archetypes & emergent homebrew**: five seed archetypes (Fighter, Rogue, Mage, Cleric, Ranger). Levels 1–20. The engine deterministically detects an emergent direction from repeated tagged events (e.g. a Fighter repeatedly attempting arcane actions crossing a count threshold); only once detected does the DM agent propose flavor for a new feature inside a fixed mechanical template — the engine computes the real numbers, the agent only supplies the fiction.

## Persistence

Each campaign is one SQLite save covering:

- **World (campaign-scoped):** pantheon/deities; `world_name` / `world_summary` / `world_history`; regions (with preseeded `region_history`); campaign races (realize-once lore); NPCs (alignment, temperament, race, speaking style, combat stats, yield/surrender state); world facts (explicitly emitted by the DM agent on world-altering narration, not auto-derived); story threads; an append-only event log; `current_state_summary`; and a preseeded TTRPG content catalog.
- **Characters (per player character):** abilities, HP, inventory/equipment, currency, race, background, journal, log book, quest log, known spells, guided-creation phase, `currentRegionId`, narration/turn history, Social/Scene projections, life status (`alive` | `dead`), death cause, persisted obituary JSON, and owned AI party members (`owner_player_character_id`).
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

### Completed (040–108)

| Range | Theme |
|-------|--------|
| 040 | **LLM efficiency** — token caps/truncation guards, merged intent+route, heuristic routing, slim context, combat/XP/loot templates, guided transcript windowing |
| 041–047 | **Play & character depth** — hit-die HP, play UX refresh, sheet/equipment/commerce/log book, quest log, spellbook, starting gear loadouts |
| 048–053 | **Identity onboarding** — delivery-standards skill; campaign races; backgrounds; NPC identity bundle + backgrounds; onboarding back persistence |
| 054–059 | **World generation layers** — cascading world → regions → NPCs; create contract tests; pantheon-first create; world history UX; region regenerate |
| 060–062 | **Packaging, XP, CI hygiene** — version in UI; mac `.dmg`; difficulty-rated XP; deadcode/security CI; codebase pruning; smoother auto-updates *(note: ids 060–062 were reused across a few tickets)* |
| 063–071 | **Prompt & guided polish** — plain-English fantasy tone; mundane-human lore; fandom canon-recall seeding; spellcheck; guided thinking / Where → starting region |
| 072–082 | **Opening-scene handoff & engineering gates** — Generate reply, opening-scene kickoff / enter-world, rebrand AI-TTRPG, deadcode as a delivery gate |
| 083 | **RAG over campaign SQLite** — local embedder, chunk index, hybrid retrieval for DM/NPC/party grounding within 040 budgets |
| 084–092 | **Social stream & NPC voice** — Social/Scene split + streaming window; selective NPC replies; speaking-style samples; auto-update parity |
| 093–104 | **Balance, branding, release polish** — starting-weapon / ability-score retunes; shield app icon; update-ready copy; deploy/CI harden |
| 107–108 | **CI sharding & identity grounding** — dynamic Vitest shards; identity kickoff grounded in race/background/gear/spells |

### In progress

| Epic | Intent |
|------|--------|
| **100** | Hide AI Party Members section on character setup (party draft wiring retained for later re-enable) |

### Active backlog

| Epic | Intent |
|------|--------|
| **020** | Local llama.cpp provider: managed `llama-server` lifecycle, adapter behind the existing provider interface, settings wiring, packaged runtime, and smoke parity across major flows without a cloud API key |
| **105** | NPC dossier modal from Social / log book — traits, player-known facts, DM opinion summary, disposition |
| **106** | Ask the DM — out-of-character chat in session chrome that never calls `turn:resolve` |

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
| **m004** | Pixel/sprite grid campaign type (FF + Pokémon-style exploration/combat) forked from the narrative create pipeline |
| **m005** | Remote play: thin client routes to the user’s PC for host-authoritative play via Player2 / local LLM (optional dumb relay; $0 developer LLM hosting) |

See `board/backlog/moonshots/README.md` for promotion rules when a moonshot graduates to the main backlog.

## Development Workflow

- **TDD**: tests are written before implementation for engine, db, and agent context-assembly logic.
- **Ticket board**: see `/board` — text-file tickets (`/board/backlog`, `/board/in-progress`, `/board/done`), each with acceptance criteria that must all be checked before a ticket is done.
- **Agent skills**: the `complete-ticket` workflow lives in `.claude/skills/complete-ticket/SKILL.md` (Claude Code) and `.cursor/skills/complete-ticket/SKILL.md` (Cursor) — keep both in sync. Delivery standards (TDD, lint/test/build/deadcode, `act` CI) are enforced via the delivery-standards skill.
- **CI**: sharded tests + oxlint + build run on both direct `push` to `main` and `pull_request` targeting `main`. `.github/workflows/pr-checks.yml` defines the jobs; deadcode runs via `.github/workflows/deadcode.yml`. To enforce this on direct pushes too, create a branch protection rule or ruleset for `main`, enable required status checks, and select the required job names.
- **Local dev**: `npm run dev` boots Electron + the React dev server + a dev SQLite file in one command. `npm run package` produces a distributable `.exe`. `npm run deadcode` (and `deadcode:refresh` when the ignore baseline intentionally drifts) is part of the delivery gate.

## License / Distribution

Personal project, shared as a packaged `.exe` with friends — no public distribution.
