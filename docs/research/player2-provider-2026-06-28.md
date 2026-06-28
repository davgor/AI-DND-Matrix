# Player2 local API research (2026-06-28)

Findings from `scripts/player2-research.mjs` run against a real, running Player2 app at `http://127.0.0.1:4315`. Captured for ticket 014.1.

## Auth
- No API key or auth header is required for local requests — Player2 is a local desktop app exposing a loopback HTTP server.

## Endpoints
- `GET /v1/models` — `200`, returns `{"object":"list","data":[{"id":..., "object":"model","created":0,"owned_by":"player2-local"}]}`. Useful for a startup/diagnostics ping, but the listed model(s) are not necessarily the chat model actually used.
- `POST /v1/chat/completions` — `200`, OpenAI-compatible request/response shape. Confirmed request fields: `messages` (array of `{role: 'system'|'user'|'assistant', content: string}`), `max_tokens`, `temperature` — all accepted.
- Unrecognized paths (e.g. `/`, `/health`) return `404` with an empty body — there is no dedicated health-check endpoint; `GET /v1/models` is the closest thing to a readiness probe.

## Response shape (success)
```json
{
  "id": "985bbbce-099f-46b6-81c5-983bc9938daa",
  "object": "chat.completion",
  "created": 1782677550,
  "model": "grok-4.1-fast",
  "choices": [
    { "index": 0, "message": { "role": "assistant", "content": "Greetings, brave adventurer!" }, "finish_reason": "stop" }
  ],
  "usage": { "prompt_tokens": 686, "completion_tokens": 5, "total_tokens": 691 }
}
```
Generated text is at `choices[0].message.content` — same path as Claude's adapter conceptually expects, but the envelope is OpenAI-shaped, not Anthropic-shaped, so the adapter needs its own response mapping.

## Error shape
- Malformed request (e.g. missing `messages`): `422`, with a **plain-text** body (not JSON) — `Failed to deserialize the JSON body into the target type: missing field \`messages\` at line 1 column 2`. The adapter must not assume the error body is JSON-parseable.
- Unreachable server (Player2 app not running): the `fetch` call itself rejects with a connection-refused network error — surfaces as a thrown error before any response is received, same as a network failure against Claude's endpoint.

## Adapter implications for 014.2/014.3
- Map `prompt` -> a `user` message, `context.systemPrompt` -> a `system` message (if present), `context.maxTokens` -> `max_tokens` — same mapping shape as the Claude adapter's `callAnthropic`.
- Read response text from `choices[0].message.content`.
- Treat any non-2xx response as a typed request error; don't call `response.json()` on the error path since the body may be plain text.
- Treat a thrown/rejected `fetch` (connection refused, Player2 not running) as a typed "Player2 unreachable" error, distinct from a non-2xx response.
- No config equivalent of `CLAUDE_API_KEY` is needed — `player2BaseUrl` (already in `AppConfig`) is the only required config value.
