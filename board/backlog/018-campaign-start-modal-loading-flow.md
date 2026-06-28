# EPIC: Campaign start modal + generation loading flow

Replace the current one-click campaign start action with a modal form where the player configures a new campaign, then show a dedicated loading experience while provider/API generation and persistence requests are running.

Broken down into sub-tickets 018.1-018.10. This epic is done when all of them are.

018.1 replace new-campaign click behavior with modal entry · 018.2 campaign setup modal form fields + schema · 018.3 modal validation + defaults + accessibility · 018.4 create-campaign request contract (renderer/main IPC) · 018.5 generation loading screen/modal state machine · 018.6 loading progress/stage messaging for API + persistence steps · 018.7 failure, cancel, retry, and back-to-form behavior · 018.8 success handoff to review/edit onboarding screen · 018.9 duplicate-submit and idempotency protection · 018.10 campaign-start smoke test (dev + packaged)
