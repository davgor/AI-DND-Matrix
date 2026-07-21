# LLM usage subscription sample report

**Status:** Fixture-backed example (112.6) — numbers are plausible Claude Sonnet 4.6 estimates, not a live export. Use as a template; replace with values from [`llm-usage-metering-smoke-test.md`](../runbooks/llm-usage-metering-smoke-test.md) captures.

## Session metadata

| Field | Value |
|-------|-------|
| Report date | 2026-07-20 |
| App version | 0.28.0 (example) |
| Provider mode | `claude` |
| Model | `claude-sonnet-4-6` |
| Price basis | Default table — $3.00 / 1M input, $15.00 / 1M output |
| Capture scope | Session A: new campaign → campaign review. Session B: 3 open-field NPC dialogue turns in play. |
| Export reference | Synthetic aggregate matching export `summary` shape (`schemaVersion: 1`) |

## Executive summary

| Metric | Setup | Play | **Total** |
|--------|------:|-----:|----------:|
| LLM calls | 25 | 7 | **32** |
| Input tokens | 163,600 | 11,870 | **175,470** |
| Output tokens | 39,050 | 1,920 | **40,970** |
| Total tokens | 202,650 | 13,790 | **216,440** |
| Est. USD | $1.08 | $0.06 | **$1.14** |
| Share of cost | **94.7%** | **5.3%** | 100% |
| Share of calls | **78.1%** | **21.9%** | 100% |

**Skew check:** One review-ready campaign create costs roughly **18×** this short NPC chat session (~$1.08 vs ~$0.06) and **3.6×** as many calls (25 vs 7). Setup dominates subscription exposure.

## Per-purpose breakdown

### Setup bucket

| Purpose | Calls | Input | Output | Total tokens | Est. USD |
|---------|------:|------:|-------:|-------------:|---------:|
| `campaign.pantheon` | 1 | 7,800 | 1,950 | 9,750 | $0.05 |
| `campaign.world` | 2 | 24,600 | 5,400 | 30,000 | $0.16 |
| `campaign.region` | 3 | 28,200 | 6,900 | 35,100 | $0.19 |
| `campaign.story` | 1 | 5,900 | 1,400 | 7,300 | $0.04 |
| `campaign.npc` | 10 | 62,400 | 14,800 | 77,200 | $0.41 |
| `onboarding.race_lore` | 1 | 3,900 | 980 | 4,880 | $0.03 |
| `onboarding.background` | 1 | 3,400 | 820 | 4,220 | $0.02 |
| `onboarding.guided_identity` | 4 | 16,800 | 4,200 | 21,000 | $0.11 |
| `onboarding.opening_scene` | 2 | 10,600 | 2,600 | 13,200 | $0.07 |
| **Setup subtotal** | **25** | **163,600** | **39,050** | **202,650** | **$1.08** |

*Note:* This fixture includes guided creation (`onboarding.*`) after review for a “first character ready to enter world” picture. Review-only capture (Session A in the runbook) omits the four `onboarding.*` rows (~9 calls, ~$0.23) but keeps the same setup ≫ play skew.

### Play bucket

| Purpose | Calls | Input | Output | Total tokens | Est. USD |
|---------|------:|------:|-------:|-------------:|---------:|
| `play.intent_route` | 3 | 2,340 | 360 | 2,700 | $0.01 |
| `play.npc_reaction` | 3 | 7,680 | 1,140 | 8,820 | $0.04 |
| `play.narration` | 1 | 1,850 | 420 | 2,270 | $0.01 |
| **Play subtotal** | **7** | **11,870** | **1,920** | **13,790** | **$0.06** |

*Note:* One extra `play.narration` call reflects a single mixed turn (player action + brief DM line). Pure converse-only Session B often shows only `play.intent_route` + `play.npc_reaction`.

## Setup vs play — ratio table

| Ratio | Value | Interpretation |
|-------|------:|----------------|
| Setup USD ÷ play USD | **18.0×** | First-time world cost dwarfs a few dialogue turns |
| Setup calls ÷ play calls | **3.6×** | Setup also uses more calls, not just larger prompts |
| Avg USD per setup call | $0.043 | Large generation prompts (`campaign.npc`, `campaign.world`) |
| Avg USD per play call | $0.009 | Slimmer turn context |
| USD per NPC dialogue turn (~2 calls) | ~$0.018 | Intent + reaction pair |
| Setup equivalent in dialogue turns | ~**60 turns** | $1.08 ÷ $0.018 ≈ how many converse turns match one setup |
| `campaign.npc` alone ÷ entire play session | **6.8×** | NPC roster generation vs field chat |

## Top cost drivers (setup)

1. **`campaign.npc`** — 38% of setup USD, 40% of setup calls (roster + bundles + speaking style).
2. **`campaign.region` + `campaign.world`** — 32% of setup USD (bulk world scaffolding).
3. **`onboarding.guided_identity`** — interview turns add recurring setup before first play.

## Subscription design notes

Recommendations only — no billing implementation implied. Grounded in the measured ratios above.

| Lever | Rationale from sample |
|-------|----------------------|
| **Meter campaign create separately** | ~95% of sample USD is setup; unlimited “play messages” without a create cap subsidizes heavy world generation. |
| **Included play dialogue allowance** | Play session was ~$0.06 for 3–4 turns; a tier with ~500–1000 such turns/month ≈ $10–18 raw LLM at these rates (before margin) — tune to target ARPU. |
| **“World energy” or create credits** | One review-ready world ≈ 18× this chat session; 1 credit ≈ one campaign create, or fractional credits for hub **Generate region** (`campaign.region`). |
| **Hub region/NPC add-ons as setup** | `campaign.region` / `campaign.npc` behave like mini-creates; align with create credits or a lower per-action meter. |
| **Onboarding bundle** | `onboarding.*` is ~21% of setup USD in this fixture; fold into create credit or first-character inclusion. |
| **Do not meter `play.intent_route` alone** | Pair with player-visible actions; intent is ~15% of play tokens here — bundle as “turn” not raw call. |
| **OOC / recap / combat as play tier** | Not in this sample; price table should assume wider `play.*` mix for paid tiers (see gaps). |
| **Claude vs local tier split** | Local Player2 priced $0 in-app; a “bring your own cloud” tier vs “hosted Claude” tier matches cost structure. |

**Illustrative tier sketch (not product commitment):**

- **Free:** 1 create credit / month, capped play turns (e.g. 50 converse-equivalent).
- **Standard:** 3 creates, generous play pool; hub region gen costs 0.25 credit.
- **Premium:** unlimited play meter soft-cap; creates unlimited with fair-use on `campaign.npc` volume.

## Gaps and confidence

| Gap | Impact on this report |
|-----|------------------------|
| **Fixture, not live export** | Ratios are directionally correct; live campaigns vary ±30% on region/NPC counts and retries. |
| **Player2 / llama without usage** | Token fields null → `estimatedCostUsd: "unknown"`; cannot compute ratios; defaults show $0 anyway. **Confidence: low** for local-only playtests. |
| **Missing price for unknown models** | Unlisted Claude model IDs estimate $0 until table updated — understates cost. |
| **Retry / escalation aggregation** | Call counts may hide failed attempts; cost may be understated if retries are not rolled up. |
| **Session B narrow** | No `play.combat`, `play.loot_xp`, `play.ooc_dm`, `play.recap`, dossier opinion (`play.npc_reaction` on open). Real play USD/turn may be **higher**. |
| **Session A variant** | Review-only vs review + guided creation changes setup by ~9 calls; both still ≫ play. |
| **Multi-character hub** | Second character repeats much `onboarding.*` without full `campaign.*` — different setup curve not captured here. |
| **No infra / margin** | USD is provider list price only; subscription price needs margin, support, and embedding/RAG overhead (not all LLM calls). |

**Overall confidence:** **Medium** for setup ≫ play direction on Claude; **low** for absolute dollar totals until live exports replicate across 3+ playtesters.

## Report template (empty)

Duplicate the sections below for a new capture.

### Session metadata

| Field | Value |
|-------|-------|
| Report date | |
| App version | |
| Provider mode | |
| Model | |
| Price basis | |
| Capture scope | |
| Export filename | |

### Executive summary

| Metric | Setup | Play | Total |
|--------|------:|-----:|------:|
| LLM calls | | | |
| Input tokens | | | |
| Output tokens | | | |
| Est. USD | | | |
| Share of cost | | | |

### Per-purpose breakdown

Copy rows from export `summary.byPurpose` grouped by bucket.

### Setup vs play ratios

| Ratio | Value |
|-------|------:|
| Setup USD ÷ play USD | |
| Setup calls ÷ play calls | |
| USD per dialogue turn | |

### Subscription design notes

(Bullet recommendations tied to measured ratios.)

### Gaps and confidence

(Provider, scope, and sample-size limitations.)
