# D20 overlay — trigger & product lock (118.1)

See also the comment block at the top of `d20OverlayLogic.ts`.

| Rule | Behavior |
|------|----------|
| Trigger | New live `TurnResult.check` after mount (`observeLiveCheck`) |
| Face | Natural `check.roll` (clamped 1–20) |
| Replace | New check cancels/replaces in-flight overlay |
| Pointer | Overlay root is `pointer-events: none` |
| Show rolls on | Settled face label persists through settle hold |
| Show rolls off | Animation still runs; face uses **brief-then-clear** (`D20_SHOW_ROLLS_OFF_FACE_POLICY`) |
| Reduced motion | No travel tumble; brief fade/pop then clear |

Duration constants live in `d20OverlayLogic.ts` only.
