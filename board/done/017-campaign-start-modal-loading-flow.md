# EPIC: Campaign start modal + generation loading flow

Replace the current one-click campaign start action with a modal form where the player configures a new campaign, then show a dedicated loading experience while provider/API generation and persistence requests are running.

Broken down into sub-tickets 017.1-017.10. This epic is done when all of them are.

017.1 replace new-campaign click behavior with modal entry · 017.2 campaign setup modal form fields + schema · 017.3 modal validation + defaults + accessibility · 017.4 create-campaign request contract (renderer/main IPC) · 017.5 generation loading screen/modal state machine · 017.6 loading progress/stage messaging for API + persistence steps · 017.7 failure, cancel, retry, and back-to-form behavior · 017.8 success handoff to review/edit onboarding screen · 017.9 duplicate-submit and idempotency protection · 017.10 campaign-start smoke test (dev + packaged)
