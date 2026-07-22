# Play shell resilience (Epic 136)

Renderer crashes and mid-turn provider failures must recover locally without remote telemetry (**001**). This spec locks boundary placement, turn attempt identity, and retry vs abort rules so currency, XP, and world mutations are never applied twice.

## ErrorBoundary (136.2)

| Placement | Rationale |
|-----------|-----------|
| `ReadyAppPlayView` wraps `PlayView` | Play shell is the dense React tree that can throw after narration load, overlays, and sheet tabs (**119** class). |
| Hub / onboarding / titlebar stay **outside** the boundary | A play-only throw must not trap navigation to campaigns or settings. |

**Fallback UI (production copy, non-technical):**

- Short error summary (no stack traces, no provider names).
- **Return to Hub** — primary recovery; calls the same handler as session chrome.
- **Reload play** (optional) — remounts the play subtree only; does not wipe the DB.

No Sentry / remote crash upload in v1.

## Turn failure surfacing (136.3)

`turn:resolve` returns a typed **`TurnResolveResult`** instead of throwing across IPC:

```ts
| { ok: true; result: TurnResult }
| { ok: false; category; message; retryable; turnAttemptId }
```

Categories mirror guided creation parity: `provider_error`, `schema_error`, `validation_error`, `internal_error`. Player copy comes from `turnFailureMessage()` — never raw exception text.

Play chrome shows the failure in the DM scene header:

| `retryable` | Actions |
|-------------|---------|
| `true` | **Retry** (same `turnAttemptId` + input) and **Abort** |
| `false` | **Abort** only |

Success clears failure state and returns exposition to idle.

## Turn attempt identity (136.4)

| Field | Owner | Purpose |
|-------|-------|---------|
| `turnAttemptId` | Renderer generates once per submit; reused on Retry | Idempotency key for IPC + in-memory ledger |
| `clientTraceId` | Optional DEV trace (**089**) | Unchanged; correlates logs only |

**No-double-write rule (locked):**

1. Main keeps an in-memory `TurnAttemptLedger` keyed by `turnAttemptId` (no schema migration required for v1).
2. **Completed** attempt → return cached `TurnResult`; do not re-enter the engine.
3. **Failed before any mutation** → `retryable: true`; retry re-executes safely.
4. **Failed after mutation** → `retryable: false`; player must **Abort**; DB keeps last good save snapshot.
5. **Abort** → clear renderer failure UI, refresh log; never calls resolve again for that attempt id.

Mutation boundary: `TurnExecutionHooks.onMutationCommitted()` fires before the first durable write in the turn pipeline (rest/travel HP, events, combat commits, routed audit events, dying resolution, etc.). Provider failures during intent/routing **before** that hook remain retryable.

## Shared types

See `src/shared/playResilience/types.ts` for `TurnResolveResult`, `PendingTurnFailure`, and `TurnFailureCategory`.

## Out of scope (v1)

- Remote crash reporting
- Persistent turn-attempt table (schema 56 reserved if cross-session retry is needed later)
- Full undo / time-travel
