# EPIC: Player2 provider adapter

Adds the Player2 local-LLM provider as a second adapter behind the same provider interface Claude implements, mirroring epic 005's shape. Research findings against the real running Player2 app are in [docs/research/player2-provider-2026-06-28.md](../../docs/research/player2-provider-2026-06-28.md).

Broken down into sub-tickets 014.1-014.4. This epic is done when all of them are.

014.1 Player2 research script · 014.2 Player2 adapter implementation · 014.3 Player2 adapter error handling · 014.4 Player2 manual smoke test

## Sub-tickets

### 014.1 Player2 research script

#### Description
Write a standalone script (outside the app) that hits the running Player2 service at 127.0.0.1:4315 and logs the real request/response shape, since the API is currently unverified. This is the seed ticket for the deferred Player2 provider epic (014) — once findings are in, write the remaining sub-tickets (provider adapter, error handling, manual smoke test) mirroring epic 005's Claude adapter shape.

#### Acceptance Criteria
- [x] With Player2 running locally, the script successfully calls it and prints the response
- [x] Findings (auth method, endpoint path(s), request payload shape, response payload shape, error format) are written down in a short reference doc or code comment
- [x] The script is not part of the app's build/test pipeline (research-only artifact)

### 014.2 Player2 adapter implementation

#### Description
Implement the Player2 provider adapter against the local OpenAI-compatible `/v1/chat/completions` endpoint, satisfying the provider interface from ticket 005.1, per the request/response shape confirmed in 014.1's research findings.

#### Acceptance Criteria
- [x] `/agents/providers/player2.ts` implements the provider interface, calling Player2's `/v1/chat/completions` endpoint with the base URL from `loadConfig()`
- [x] `context.systemPrompt` maps to a `system` message and `prompt` maps to a `user` message; `context.maxTokens` maps to `max_tokens`
- [x] Generated text is read from `choices[0].message.content`
- [x] The adapter is unit tested against a mocked HTTP layer (no real network calls in the test suite) covering a successful generation

### 014.3 Player2 adapter error handling

#### Description
Handle the cases where the Player2 call fails — non-2xx response (plain-text error body, per 014.1's findings) or the local Player2 app not running (connection refused) — as typed errors rather than uncaught exceptions.

#### Acceptance Criteria
- [x] A non-2xx response from Player2 surfaces as a typed request error without assuming the error body is JSON (it may be plain text)
- [x] A connection failure (Player2 app not running/unreachable) surfaces as a typed "unreachable" error distinct from a non-2xx response
- [x] Unit tested for both cases against a mocked HTTP layer

### 014.4 Player2 manual smoke test

#### Description
Confirm the Player2 adapter works end-to-end against the real, locally running Player2 app, and that provider selection routes to it when `AGENT_PROVIDER=player2`.

#### Acceptance Criteria
- [x] With Player2 running locally, calling the adapter's `generate` returns a real generated response (not a mock)
- [x] Setting `AGENT_PROVIDER=player2` routes agent calls through the Player2 adapter via `createProviderRegistry`/`selectProvider`, replacing the former not-implemented stub
- [x] The check is documented as manual (not part of the CI suite) since it requires a locally running Player2 app
