# LLM usage metering — contract

Desktop-first instrumentation for epic **112**. Every production `provider.generate` call records token usage (when the upstream returns it) tagged with a stable **purpose** id so we can compare setup vs play cost and export a playtester-sendable log.

## Authority

| Provider | Usage source | Notes |
|----------|--------------|-------|
| Claude (Anthropic Messages) | `usage.input_tokens` / `usage.output_tokens` | Authoritative when present |
| Player2 / llama OpenAI-compatible | `usage.prompt_tokens` / `usage.completion_tokens` | May be absent; record nulls, do not invent |
| Failed / truncated (discarded) calls | — | Do not invent fake usage; success events only for completed generates |

## Purpose ids

Purpose ids are stable once shipped. Bucket is derived from the purpose (not stored independently at call sites). See `LLM_PURPOSE_IDS` / `LLM_PURPOSE_BUCKETS` in `types.ts`. Primary subscription split: **setup** vs **play** (`meta` for probes / unclassified).

Undocumented production calls fall back to `other.unclassified` (dev warning path).

## GenerateContext

Call sites pass `purpose` (required in production), optional `campaignId` / `characterId`. Adapters invoke optional `onUsage` with a token snapshot after a successful response. Wrappers (retry / token escalation) may aggregate attempts under one purpose before the outer `onUsage` fires.

## Persistence & export

Events live in app SQLite (`llm_usage_events`). Playtester export is one JSON file from Settings — summary rollups + event rows + app/provider metadata, **no API keys, prompts, or response bodies**. No auto-upload.
