# AI D&D Matrix

A single-player, text-adventure-style D&D desktop app (Electron + React + TypeScript). Two cooperating AI agents run the game — a **DM agent** that sets scenes, drives the plot, and designs encounters, and **NPC/party-member agents** that roleplay individual characters and enemies. Campaigns are generated from a free-text prompt and then played; world state is durable and causally consistent — if you burn down a village, every later scene remembers it's gone.

## Status

Core gameplay loop (campaign generation, character creation, play, NPC promotion, packaging) is implemented; see `/board` for the ticket backlog and the full design plan at the bottom of this README.

## Setup

**Running the packaged app** (if someone sent you `AI D&D Matrix.exe`, start here):

1. Place a `.env` file in the same folder as the `.exe` (see below for what it needs).
2. Double-click `AI D&D Matrix.exe`. It's a portable build — no installer, no admin rights, nothing else to install.

**Configuring a Claude API key** (the default, recommended provider):

1. Get an API key from [console.anthropic.com](https://console.anthropic.com).
2. Create a `.env` file (next to the `.exe` for a packaged build, or at the repo root for a dev checkout) with:
   ```
   AGENT_PROVIDER=claude
   CLAUDE_API_KEY=sk-ant-...
   ```
3. `CLAUDE_MODEL` is optional and defaults to a current Claude model — only set it if you want a specific one.

**Switching providers**: set `AGENT_PROVIDER` in `.env` to the provider name (e.g. `claude`) — no code changes or rebuild required. Player2 (a local LLM runner) is the planned second provider but its adapter is deferred (ticket board epic 014) until after v1; selecting it today will surface a clear "not implemented yet" error rather than failing silently.

**Running from source** (for development): `npm install`, then `npm run dev` boots Electron + the React dev server + a dev SQLite file in one command. `npm run package` produces the distributable `.exe` in `release/`.

## Core Design

- **Engine and database are the source of truth.** AI agents read state to produce narration and propose actions; a deterministic rules engine validates and resolves everything (dice, checks, damage, death) before it's persisted. Agents never decide outcomes themselves.
- **Every agent call is re-grounded from SQLite**, never from chat history — this is what makes destroyed regions, dead NPCs, and past choices stick.
- **NPCs have isolated memory.** Each NPC has its own private memory log; it only ever sees its own memories plus world facts explicitly tagged to its region/faction. No NPC can "know" something only another NPC experienced.
- **Provider-agnostic LLM backend.** A pluggable provider interface backs the DM/NPC/party-member agents — initial target is Claude (Anthropic Messages API), swappable to [Player2](http://127.0.0.1:4315) (local) or others via runtime config, no code changes required. The Player2 adapter is deferred (ticket board epic 014) until after v1's Claude-backed definition of done.

## Tech Stack

- Electron + React + TypeScript
- SQLite (`better-sqlite3`) for persistence, one save per campaign
- Vitest + npm for testing
- oxlint (strict, complexity-aware) for linting
- GitHub Actions for PR checks (tests + lint + build, required); deploy-on-merge packaging is scaffolded but disabled until promoted

## Architecture

```
/src
  /main          Electron main process: frameless window lifecycle, SQLite access, IPC handlers
  /preload       contextBridge-exposed IPC API surface for renderer
  /renderer      React + TS UI:
                   /titlebar      custom draggable titlebar (min/max/close)
                   /sidebar       collapsible campaign list
                   /play          side-by-side DM narration panel + player speech/action panel
                   /setup         campaign generation review, character creation
  /engine        Pure TS, no Electron/LLM deps: rules engine (checks, combat, dice), world-state model
  /agents        Agent orchestration: dm.ts, npc.ts, partyMember.ts, provider interface + Claude adapter
  /db            SQLite schema, migrations, repository layer
  /shared        Types shared between main/renderer/engine/agents
```

Electron security baseline (from the first scaffold, not retrofitted): `contextIsolation` on, `nodeIntegration` off, `sandbox` on, narrow typed IPC channels only, CSP restricting remote content.

## Rules Engine

A custom, simplified 5E-like ruleset, fully deterministic and unit-tested — agents narrate outcomes, they never invent them.

- **Four abilities**: Body (STR+CON), Agility (DEX), Mind (INT+WIS), Presence (CHA). Modifier = `floor((score-10)/2)`. Score generation: point buy, standard array, or roll-for-stats — player's choice.
- **Core resolution**: `d20 + ability modifier + (proficiency bonus if proficient) vs DC/AC`, with advantage/disadvantage (roll 2d20, take higher/lower). No separate skill list — the DM agent flags an ability + a proficiency boolean per check from context; the engine owns the actual bonus amount.
- **Saves**: all four abilities have a corresponding save. **AC**: `10 + Agility modifier + armor bonus`. **HP**: archetype hit die (fixed average) + Body modifier per level. **Crits**: natural 20 doubles damage dice.
- **Damage types**: Physical, Fire, Cold, Poison, Arcane, with resistance/vulnerability. **Conditions**: Prone, Stunned, Poisoned, Restrained, Unconscious.
- **Inventory/economy**: narrative item list (no weight tracking), single currency debited/credited only by the engine, prices narrated contextually by the DM agent (engine clamps any proposed price, same guardrail pattern as DC).
- **Combat**: initiative rolled once per encounter (`d20 + Agility`); one Action + Movement per turn; combat actions are typed in the same free-text box as exploration. At 0 HP, characters fall Unconscious and make dying saves — only losing that sequence triggers the campaign's death mode.
- **Death modes** (chosen per campaign): **Legendary** (permanent death), **Standard** (auto-saved snapshot after every resolved action is restored — no explicit player save step), **Respawn** (world-defined respawn rules mechanically applied: relocate, deduct cost, enforce limits).
- **In-game time**: a simple day counter per campaign — long rest advances it 1 day, travel advances it by a DM-estimated, engine-clamped amount. Drives region-history compression below.
- **Abilities/spells cost turns, not mana.** Every non-basic ability resolves immediately, then locks the character out of acting for as many turns as the player chose to spend — formulaic scaling per extra turn, same system for every archetype.
- **Archetypes & emergent homebrew**: five seed archetypes (Fighter, Rogue, Mage, Cleric, Ranger). Levels 1–20. The engine deterministically detects an emergent direction from repeated tagged events (e.g. a Fighter repeatedly attempting arcane actions crossing a count threshold); only once detected does the DM agent propose flavor for a new feature inside a fixed mechanical template — the engine computes the real numbers, the agent only supplies the fiction.

## Persistence

Each campaign is one SQLite save covering regions (with a preseeded, periodically-compressed `region_history`), NPCs, characters (including currency), per-NPC private memories, world facts (explicitly emitted by the DM agent on world-altering narration, not auto-derived), story threads (state/summary updated by the DM agent as the plot progresses), an append-only event log, and auto-written save snapshots (one after every resolved action, used to revert on death under Standard mode). Schema changes ship as numbered, forward-only migrations applied automatically on open.

## Development Workflow

- **TDD**: tests are written before implementation for engine, db, and agent context-assembly logic.
- **Ticket board**: see `/board` — text-file tickets (`/board/backlog`, `/board/in-progress`, `/board/done`), each with acceptance criteria that must all be checked before a ticket is done.
- **CI**: every PR runs tests + oxlint + build; all required to merge. `.github/workflows/pr-checks.yml` defines three jobs — `test`, `lint`, `build` — on `pull_request` against `main`. GitHub branch protection doesn't pick these up automatically; once the workflow has run at least once on the repo, go to Settings → Branches → branch protection rule for `main` → enable "Require status checks to pass before merging" → select `test`, `lint`, and `build` by name.
- **Local dev**: `npm run dev` boots Electron + the React dev server + a dev SQLite file in one command (once scaffolded). `npm run package` produces a distributable `.exe`.

## License / Distribution

Personal project, shared as a packaged `.exe` with friends — no public distribution.
