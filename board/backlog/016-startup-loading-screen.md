# EPIC: Startup loading screen (LLM + DB boot)

Build a real game-style loading flow that appears on app startup, blocks gameplay until core systems are ready, and communicates boot progress clearly to the player.

Broken down into sub-tickets 016.1-016.9. This epic is done when all of them are.

016.1 startup boot contract + readiness states · 016.2 loading screen UI + game-style presentation · 016.3 startup orchestrator (main process + IPC) · 016.4 DB boot stage (open/migrate/health) · 016.5 LLM boot stage (launch/health/warmup) · 016.6 progress telemetry + stage messaging · 016.7 boot failure handling + retry UX · 016.8 startup handoff transition to app shell · 016.9 startup smoke test (dev + packaged)
