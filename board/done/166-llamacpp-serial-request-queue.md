# 166 — Serialize llama.cpp generate() to avoid HTTP 500 storms

Near the end of campaign create (shortfall NPC fill with concurrency 4, plus retries), multiple parallel `Provider.generate()` calls hit local `llama-server`. Concurrent completions commonly return HTTP 500; `withRetry` then burns three attempts at `baseDelayMs: 50` and logs `Provider unreachable after 3 attempts` three times at the same timestamp.

## Acceptance criteria

- [x] Shared serial queue ensures overlapping `generate()` calls run one at a time (unit test)
- [x] Shared/module queue for llamacpp so separate `buildAgentProvider()` instances cannot race the same server
- [x] `buildAgentProvider` wraps llamacpp (not cloud providers) with the serial queue outside `withRetry`
- [x] llamacpp retry `baseDelayMs` is longer than the cloud default (room for server recovery after 500)
- [x] Unit tests + delivery gate pass
