# EPIC: Startup loading screen (LLM + DB boot)

Build a real game-style loading flow that appears on app startup, blocks gameplay until core systems are ready, and communicates boot progress clearly to the player.

Broken down into sub-tickets 015.1-015.9. This epic is done when all of them are.

015.1 startup boot contract + readiness states · 015.2 loading screen UI + game-style presentation · 015.3 startup orchestrator (main process + IPC) · 015.4 DB boot stage (open/migrate/health) · 015.5 LLM boot stage (launch/health/warmup) · 015.6 progress telemetry + stage messaging · 015.7 boot failure handling + retry UX · 015.8 startup handoff transition to app shell · 015.9 startup smoke test (dev + packaged)
