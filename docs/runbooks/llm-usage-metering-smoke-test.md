# LLM usage metering smoke test (112.6)

Repeatable capture procedure for subscription-modeling samples. Contrasts **setup** bucket workloads (campaign create through review-ready world) with **play** bucket workloads (short open-field NPC chat). Export the usage log after each session and fill the report template in [`docs/reports/llm-usage-subscription-sample.md`](../reports/llm-usage-subscription-sample.md).

## Prerequisites

- Dev or packaged build with LLM usage metering enabled (epic **112**).
- **Claude provider recommended** for this smoke — token counts and USD estimates are authoritative on Claude. Player2/local runtimes may record `null` tokens (see [Gaps](#gaps-and-confidence)).
- `.env` with `AGENT_PROVIDER=claude` and a valid `CLAUDE_API_KEY`.
- Fresh app session or note the export timestamp so you can isolate events.

Reference: purpose taxonomy and call sites in [`llm-usage-call-site-inventory.md`](llm-usage-call-site-inventory.md). Price defaults: `src/shared/llmUsage/priceTable.ts` (Claude Sonnet 4.6 — $3/M input, $15/M output).

## Session A — Campaign create through review-ready world

**Goal:** Record setup-bucket usage from a new campaign through the **campaign review** screen (generated world visible; no play entry required).

**Stop before:** guided character creation, entering play, or hub actions that add more `campaign.*` calls.

1. Launch the app (`npm run dev` or packaged `.exe`).
2. Confirm provider mode is **Claude** (titlebar **Settings** → provider section).
3. From the sidebar, click **New Campaign**.
4. Enter a premise (and optional name / death mode). Use default region/NPC counts unless you are testing a specific generation profile.
5. Click **Create campaign** and wait through loading stages (premise → interpret → save).
6. On **campaign review**, confirm generated regions and NPCs are visible and **Continue** is enabled (or note why it is disabled — empty region, etc.).
7. **Do not** click **Continue**, enter play, or start guided creation.
8. Export the usage log (see [Export procedure](#export-procedure)).

**Expected setup purposes in export (partial list):**

| Purpose | Typical source |
|---------|----------------|
| `campaign.pantheon` | Pantheon generation |
| `campaign.world` | World + canon recall |
| `campaign.region` | Bulk / additional regions |
| `campaign.story` | Story thread |
| `campaign.npc` | Bestiary roster, flagged NPC bundles, speaking style |

**Rough expectations (Claude Sonnet, default counts):** ~15–30 LLM calls, tens of thousands of input tokens, estimated **$0.50–$2.00** at default list prices. Exact totals vary with region/NPC counts and retries.

## Session B — Short open-field NPC conversation

**Goal:** Record play-bucket usage for a few turns of field dialogue with a known NPC (no combat, no loot/XP resolution).

**Prerequisites:** A campaign with at least one playable character already in the world (complete guided creation or resume from hub). Ideally use a **separate export** after Session A, or note timestamps so play events are easy to filter.

1. Enter **play** for that character (exploration / open field — not combat).
2. In the player action panel, address a **previously met** NPC with short conversational lines (questions, greetings). Aim for **3–4 dialogue turns** (player speaks → NPC replies).
3. Avoid: starting combat, skill checks that trigger `play.narration`, loot/XP, Ask the DM (OOC), session recap, or opening NPC dossier opinion (adds extra `play.npc_reaction` calls).
4. Confirm Social stream shows NPC italic dialogue; Scene column should not gain redundant DM paragraphs on pure converse turns (see [`gameplay-loop-smoke-test.md`](gameplay-loop-smoke-test.md)).
5. Export the usage log again.

**Expected play purposes:**

| Purpose | Typical source |
|---------|----------------|
| `play.intent_route` | Intent / routing per turn (~1 per player message) |
| `play.npc_reaction` | NPC dialogue generation |

**Rough expectations:** ~4–8 LLM calls for 3–4 converse turns (often **2 calls per turn**: intent + NPC reaction), low thousands of input tokens, estimated **$0.03–$0.10** at default list prices.

## Export procedure

1. Open **Settings** — click the gear (**Settings**) button in the **titlebar** (top-right of the app window).
2. Scroll to the **LLM usage** section (below provider configuration).
3. Optional: review the **Last 7 days** table (Setup / Play buckets — calls, tokens, est. cost).
4. Click **Export usage log**.
5. Choose a save location in the system dialog. Filename pattern: `ai-ttrpg-usage-YYYYMMDD-HHmmss.json` (UTC).
6. Note the saved path shown under the button (`Saved to …`).

IPC: `window.llmUsage.exportLog()` (preload). Payload shape: `schemaVersion`, `exportedAt`, `appVersion`, `platform`, `providerMode`, `campaignIdFilter`, `summary` (`byPurpose`, `byBucket`), `events`.

## Playtester handoff (paste into invite)

Copy the block below into Discord/email/playtest instructions. Replace `[maintainer]` with the contact handle or email you use for builds.

---

**After your session — send usage log (required for cost research)**

1. Click the **gear icon** (Settings) in the **top-right titlebar**.
2. Find **LLM usage** and click **Export usage log**.
3. Save the file (name looks like `ai-ttrpg-usage-20260720-143022.json`).
4. Send the **`.json` file** to **[maintainer]** (Discord DM or email attachment). One file per session is fine; if you did both a new campaign and some play, one export covering both is OK.

**What the file contains**

- App version, platform, and provider mode (e.g. `claude` — **not** your API key).
- Per-call token counts (when the provider returned them), purpose tags (`campaign.world`, `play.npc_reaction`, etc.), timestamps, campaign/character ids.
- Summary rollups by purpose and by bucket (setup vs play).

**What the file does NOT contain**

- API keys, bearer tokens, or `.env` secrets.
- Raw prompts, model responses, or your chat / narration text.
- Anything needed to impersonate your account.

We use this only to estimate LLM cost for subscription pricing. No upload happens automatically — you choose when to export and send.

---

## Turning export JSON into a subscription sample report

1. Open the exported JSON and read `summary.byBucket` for setup vs play share.
2. Copy `summary.byPurpose` into the per-purpose table in [`docs/reports/llm-usage-subscription-sample.md`](../reports/llm-usage-subscription-sample.md) (or duplicate that file for a new dated report).
3. Sum `eventCount`, `inputTokens`, `outputTokens`, and `estimatedCostUsd` for totals.
4. Compute ratios: setup USD ÷ play USD; setup calls ÷ play calls; average USD per play dialogue turn (Session B calls ÷ turns).
5. Fill **Subscription design notes** and **Gaps** from measured ratios — recommendations only.

## Automated checks (related)

Metering plumbing is covered by unit tests; this runbook is manual capture:

```bash
npx vitest run src/shared/llmUsage src/db/repositories/llmUsageEvents.test.ts src/main/llmUsageIpc.test.ts
```

## Gaps and confidence

| Gap | Effect on this smoke |
|-----|----------------------|
| **Player2 / llama.cpp without usage headers** | Events persist with `inputTokens` / `outputTokens` null; USD shows `unknown` — ratios unreliable for subscription math. Use Claude for capture runs. |
| **Local $0 price table** | Player2 is priced at $0 in defaults; infra/electricity not modeled. |
| **Retries / token escalation** | Multiple attempts may aggregate under one purpose; call count understates upstream round-trips. |
| **Session A scope** | Stopping at review excludes `onboarding.*` and first-play costs; full “new player to first dialogue” is higher than review-only. |
| **Session B scope** | Pure converse omits combat, narration checks, OOC, recap — play bucket in the wild is wider. |
| **No auto-upload** | Maintainer must receive the file manually; verify `exportedAt` and filename when correlating reports. |

## Recorded run (template)

| Date | Session | Provider | Calls (setup / play) | Est. USD (setup / play) | Export file | Result |
|------|---------|----------|------------------------|-------------------------|-------------|--------|
| | A — review-ready | claude | | | | |
| | B — NPC chat | claude | | | | |
