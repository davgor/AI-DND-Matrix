# 088 — Silent social resolve / missing player + NPC lines

With multiple NPCs present, converse heuristic is skipped. Turns can finish with an empty routing plan (or only a hidden `auditOnly` player_action), so Social keeps an optimistic bubble with no reply and the line vanishes on the next send.

## Acceptance criteria

- [x] Every routed turn persists a **visible** player utterance (Social), not only `auditOnly`
- [x] Non-bypass turns never execute an empty beat list — synthesize NPC reply or DM narration fallback
- [x] Heuristic fast-path does not substitute `INERT_ROUTING_PLAN` for ordinary social turns when the post-intent plan is null
- [x] Unit tests cover utterance persistence + empty-plan guard
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
