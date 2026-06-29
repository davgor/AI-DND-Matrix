# EPIC: Provider interface + Claude adapter

Broken down into sub-tickets 005.1-005.4. This epic is done when all of them are.

Claude's API (Anthropic Messages API) is well-documented and stable, unlike Player2's locally-running, unverified service — so this epic skips a research-spike ticket and goes straight from the provider interface to a real adapter implementation.

005.1 provider interface · 005.2 Claude adapter · 005.3 Claude adapter error handling · 005.4 Claude manual smoke test

See [014-player2-provider.md](014-player2-provider.md) for the deferred Player2 adapter epic.

## Sub-tickets

### 005.1 Provider interface definition

#### Description
Define the provider-agnostic interface that DM/NPC/party-member agents call, so Claude, Player2, or others can implement it interchangeably.

#### Acceptance Criteria
- [x] `/agents/providers/types.ts` defines a `generate(prompt, context) -> text` (or equivalent) interface with no Claude- or Player2-specific details leaking into it
- [x] A trivial mock implementation satisfies the interface and is usable in tests

### 005.2 Claude adapter implementation

#### Description
Implement the Claude provider adapter against the Anthropic Messages API, satisfying the provider interface from ticket 005.1.

#### Acceptance Criteria
- [x] `/agents/providers/claude.ts` implements the provider interface, calling the Anthropic Messages API with the model and API key from `loadConfig()`
- [x] The adapter is unit tested against a mocked HTTP layer (no real network calls in the test suite) covering a successful generation
- [x] No API key or other secret is ever logged or included in a thrown error's message

### 005.3 Claude adapter error handling

#### Description
Handle the cases where the Claude API call fails (missing/invalid API key, network failure, non-2xx response) gracefully.

#### Acceptance Criteria
- [x] Calling the adapter with no `CLAUDE_API_KEY` configured returns/throws a typed error before making a network call
- [x] A non-2xx response or network failure from the API surfaces as a typed error, not an unhandled exception
- [x] Unit tested for both cases against a mocked HTTP layer

### 005.4 Claude manual smoke test

#### Description
Confirm the Claude adapter works end-to-end against the real Anthropic API using the configured `CLAUDE_API_KEY`.

#### Acceptance Criteria
- [x] With a valid `CLAUDE_API_KEY` in `.env`, calling the adapter's `generate` returns a real generated response (not a mock)
- [x] The check is documented as manual (not part of the CI suite) since it costs money and requires a live API key
