# EPIC: LLM usage metering — tokens & cost by purpose

Instrument every LLM call so we can measure **real token spend per provider instance and per workload**, then use those numbers to design an optional hosted subscription (what is expensive vs cheap in practice).

Today `Provider.generate()` returns only text. Claude/Player2 adapters discard API `usage` fields. There is no durable ledger of calls, no purpose tag (campaign create vs field NPC chat), and no rollup to estimated USD. Epic **040** reduced tokens but did not meter them. Without metering, subscription tiers would be guesswork.

## Goals

- Capture **input / output / total tokens** (and model id) on every successful generate
- Tag each call with a stable **purpose** (what the LLM is doing) and optional campaign/character ids
- Persist events locally so sessions can be aggregated offline
- Estimate **USD cost** from a configurable price table (Claude API rates; local/Player2 may show tokens-only or $0)
- Produce reports that answer: “what does campaign setup cost vs an open-field NPC conversation?”
- Ship a **playtester-sendable usage log**: one obvious in-app action that writes a single file playtesters can attach (Discord/email) with no secrets and no prompt/response bodies

## Non-goals (v1)

- Billing customers or enforcing subscription quotas (follow-up once numbers exist)
- Hosting a cloud meter for multiplayer (m002/m005) — this epic is desktop-first instrumentation
- Changing agent prompts solely for cost (continue to rely on **040** for efficiency)
- Auto-upload / telemetry of usage (playtesters must choose to export and send the file)

## Purpose taxonomy (v1 — extend carefully; keep stable ids)

| Purpose id | Bucket | Examples |
|------------|--------|----------|
| `campaign.pantheon` | setup | pantheon generation |
| `campaign.world` | setup | world / history / summary |
| `campaign.region` | setup | region generation / regen |
| `campaign.npc` | setup | bulk or flagged NPC generation |
| `campaign.story` | setup | story threads / hooks |
| `onboarding.race_lore` | setup | race lore realize |
| `onboarding.background` | setup | personal background story |
| `onboarding.guided_identity` | setup | guided identity kickoff/turns |
| `onboarding.opening_scene` | setup | opening scene |
| `play.intent_route` | play | interpret intent / merged route |
| `play.narration` | play | DM narrate / turn review |
| `play.npc_reaction` | play | single NPC dialogue/reaction |
| `play.party_member` | play | party-member decide/act |
| `play.inactive_proxy` | play | inactive player encounter proxy |
| `play.combat` | play | combat catch-up / yield / defeat flavor |
| `play.loot_xp` | play | loot / XP / homebrew flavor passes |
| `play.recap` | play | recap generation |
| `play.ooc_dm` | play | Ask the DM OOC (**106**, when present) |
| `system.ping` | meta | settings connectivity probe |
| `other.unclassified` | meta | temporary until call site tagged |

Buckets `setup` vs `play` are the primary subscription-design split; finer purpose ids support deeper tuning.

## Definition of done

- Every production `provider.generate` path records usage with purpose + provider/model
- Local persistence + aggregation APIs exist
- **Playtester export:** Settings (or equivalent always-reachable UI) offers “Export usage log” → save dialog → one JSON file containing summary rollups + event rows, app/provider metadata, **no API keys / no prompt text**; documented one-liner for playtesters (“Settings → Export usage log → send me the file”)
- A documented sample report compares **campaign create** vs **field NPC conversation** with token and estimated $ figures
- Tests cover usage parsing, purpose tagging, persistence, aggregation, and export payload shape (secrets excluded)
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

Broken down into **112.1–112.7**.

112.1 usage + purpose contract · 112.2 provider adapters emit usage · 112.3 persist usage events · 112.4 tag all call sites · 112.5 aggregation, playtester export, and cost estimate · 112.6 subscription-modeling sample report · 112.7 tests and verification

## Sub-tickets

### 112.1 Usage + purpose contract

#### Description
Define the shared TypeScript contract for LLM usage records and the stable purpose taxonomy used across providers, agents, and persistence. This is the schema subscription modeling will rely on — keep purpose ids stable once shipped.

#### Acceptance Criteria
- [x] `LlmUsage` (or equivalent) type includes: provider name, model id, inputTokens, outputTokens, totalTokens (or nullable when unknown), purpose id, optional campaignId/characterId, timestamp, success/error outcome
- [x] `GenerateContext` (or parallel arg) accepts a required-in-production `purpose` field; undocumented calls fall back to `other.unclassified` with a testable warning path in dev
- [x] Purpose taxonomy table from epic **112** is mirrored in code as a const union / enum with bucket (`setup` | `play` | `meta`)
- [x] Contract docs note Claude usage is authoritative when present; Player2/local may omit usage until the upstream returns it
- [x] Unit tests lock the purpose id set and bucket mapping

### 112.2 Provider adapters emit usage

#### Description
Parse and return token usage from Claude (Anthropic Messages `usage`) and Player2/OpenAI-compatible responses. Extend `Provider.generate` (or add `generateWithUsage`) so callers can record metering without re-fetching.

#### Acceptance Criteria
- [x] Claude adapter extracts `usage.input_tokens` / `usage.output_tokens` (and total when available) on successful responses
- [x] Player2 / llama OpenAI-compatible adapter extracts `usage.prompt_tokens` / `usage.completion_tokens` when present; records nulls when absent without failing the call
- [x] Truncation / error paths do not invent fake usage; failed calls may record zero or omit success events per contract
- [x] Token-escalation wrapper (**040.14**) attributes usage per attempt or aggregates attempts under one purpose (documented choice; tests lock it)
- [x] Existing generate call sites keep working (compat shim or mechanical update in this ticket’s follow-on **112.4**)
- [x] Unit tests with fixture API payloads cover Claude + Player2 usage parsing

### 112.3 Persist usage events

#### Description
Store usage events in SQLite (app-level and/or per-campaign) so costs can be aggregated across sessions without relying on memory or provider dashboards.

#### Acceptance Criteria
- [x] Schema/migration adds an `llm_usage_events` (name flexible) table with indexes on purpose, bucket, campaign_id, and created_at
- [x] Repository API can insert events and query by time range / campaign / purpose / bucket
- [x] Delete-campaign path cascades or orphans are defined (prefer cascade with campaign when campaign-scoped)
- [x] Recording is best-effort: a metering write failure must not fail the player-facing generate result (log + continue)
- [x] Tests cover insert, query aggregation seeds, and campaign delete behavior

### 112.4 Tag all LLM call sites with purpose

#### Description
Pass an explicit purpose on every production `generate` call site (DM, NPC, party, campaign generation, onboarding, combat flavor, loot/XP, settings ping, etc.) so metering can allocate spend to workload categories.

#### Acceptance Criteria
- [x] Inventory of all `provider.generate` / agent entry points is listed in the ticket or a short `docs/` note and each is mapped to a purpose id
- [x] Campaign/setup paths use `campaign.*` / `onboarding.*` purposes
- [x] Play-loop paths use `play.*` purposes (intent/route, narration, npc_reaction, party_member, inactive_proxy, combat, loot_xp, recap)
- [x] Settings connectivity probe uses `system.ping`
- [x] No production call site remains on `other.unclassified` except documented temporary exceptions with a follow-up
- [x] Tests or lint-style guard (preferred: unit test scanning known wrappers) fail if a new wrapper omits purpose — or call-site tests assert purpose for representative paths

### 112.5 Aggregation, playtester export, and cost estimate

#### Description
Add rollups and a configurable price table so token totals become estimated USD per purpose/bucket — inputs for subscription tier design. **Also** ship the playtester-facing export: a single file they can save and send back (Discord/email) without digging in DB files or sharing secrets.

#### Acceptance Criteria
- [x] Aggregation returns totals by purpose and by bucket (`setup` vs `play` vs `meta`) for a time range and optional campaign
- [x] Configurable price table maps provider+model → $/1M input and $/1M output tokens (defaults for current Claude model; local/Player2 default $0)
- [x] Estimated cost = f(tokens, price table); missing usage yields “unknown” rather than $0 silently when tokens are null
- [x] **Playtester export (required):** Settings (or equivalent always-reachable UI) has an “Export usage log” (wording flexible) control that opens a save dialog and writes **one** JSON file playtesters can attach and send
- [x] Export file includes: export schema version, exportedAt, app version, OS platform, provider mode (no secrets), optional campaign filter, summary rollups (by purpose + by bucket with call counts / tokens / estimated USD), and the underlying event rows needed to re-aggregate offline
- [x] Export **must not** include: API keys, bearer tokens, raw prompts, model responses, or player chat text — unit tests assert redaction / absence
- [x] Filename is human-sortable (e.g. `ai-ttrpg-usage-YYYYMMDD-HHmmss.json`) so playtesters can tell files apart
- [x] Optional CSV sibling is fine for spreadsheet analysis, but JSON is the canonical playtester handoff format
- [x] Minimal UI section shows recent totals (can stay concise; export is the primary playtester path)
- [x] Unit tests cover aggregation math, price-table application, and export payload shape (includes required metadata; excludes secrets/prompt fields)

### 112.6 Subscription-modeling sample report

#### Description
Produce a repeatable runbook + sample report that contrasts high-cost setup workloads with low-cost play workloads, so subscription pricing can be tailored with evidence.

#### Acceptance Criteria
- [x] Runbook under `docs/runbooks/` describes how to capture: (1) new campaign create through review-ready world, (2) a short open-field NPC conversation session
- [x] Runbook includes a **playtester handoff** section: exact UI path to export the usage log, what the file contains / does not contain, and “send the `.json` file to [maintainer]” instructions suitable to paste into a playtest invite
- [x] Report template includes: call counts, input/output tokens, estimated USD, per-purpose breakdown, setup vs play share
- [x] At least one filled sample report (from a real or fixture-backed session) is checked into docs or board notes showing the expected skew (setup ≫ field NPC chat per interaction)
- [x] Explicit “subscription design notes” section lists candidate levers (metered setup, included play messages, energy for create, etc.) grounded in the measured ratios — recommendations only, no billing implementation
- [x] Gaps called out (e.g. Player2 without usage) with how they affect confidence

### 112.7 Tests and verification

#### Description
Close the epic with end-to-end verification of metering correctness and the delivery gate.

#### Acceptance Criteria
- [x] Unit/integration tests cover: usage parse, purpose tagging on representative setup + play paths, persistence, aggregation, cost estimate, **and playtester export payload** (metadata present; secrets/prompts absent)
- [x] Manual or scripted smoke: one campaign-create slice and one play NPC turn each leave usage rows with distinct purposes; export produces a file that re-aggregates to the same totals
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [x] `act` runs `.github/workflows/pr-checks.yml` and `.github/workflows/deadcode.yml` successfully
- [x] Epic **112** acceptance criteria / definition of done checked only after the above

