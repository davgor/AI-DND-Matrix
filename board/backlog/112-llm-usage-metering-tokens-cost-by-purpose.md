# EPIC: LLM usage metering — tokens & cost by purpose

Instrument every LLM call so we can measure **real token spend per provider instance and per workload**, then use those numbers to design an optional hosted subscription (what is expensive vs cheap in practice).

Today `Provider.generate()` returns only text. Claude/Player2 adapters discard API `usage` fields. There is no durable ledger of calls, no purpose tag (campaign create vs field NPC chat), and no rollup to estimated USD. Epic **040** reduced tokens but did not meter them. Without metering, subscription tiers would be guesswork.

## Goals

- Capture **input / output / total tokens** (and model id) on every successful generate
- Tag each call with a stable **purpose** (what the LLM is doing) and optional campaign/character ids
- Persist events locally so sessions can be aggregated offline
- Estimate **USD cost** from a configurable price table (Claude API rates; local/Player2 may show tokens-only or $0)
- Produce reports that answer: “what does campaign setup cost vs an open-field NPC conversation?”

## Non-goals (v1)

- Billing customers or enforcing subscription quotas (follow-up once numbers exist)
- Hosting a cloud meter for multiplayer (m002/m005) — this epic is desktop-first instrumentation
- Changing agent prompts solely for cost (continue to rely on **040** for efficiency)

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
- Local persistence + aggregation APIs/CLI or settings export exist
- A documented sample report compares **campaign create** vs **field NPC conversation** with token and estimated $ figures
- Tests cover usage parsing, purpose tagging, persistence, and aggregation
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

Broken down into **112.1–112.7**.

112.1 usage + purpose contract · 112.2 provider adapters emit usage · 112.3 persist usage events · 112.4 tag all call sites · 112.5 aggregation export and cost estimate · 112.6 subscription-modeling sample report · 112.7 tests and verification
