# EPIC: Moonshot m002 - host-driven multiplayer with host-side AI routing

Enable multiplayer campaigns where one host session is authoritative and incurs AI routing/costs, while connected players can chat and interact in real time.

Core concept:
- host owns campaign runtime and AI provider usage
- guests join quickly with a simple command
- each guest joins as a specific party member identity and keeps that identity consistently
- guests can interact/chat freely while host is online
- each joined player can toggle whether their party member is AI-controllable (`ai-able`)
- when an absent guest is `ai-able`, host-side AI can drive that party member using prior guest interaction history as personality/context input
- when an absent guest is not `ai-able`, the DM generates an intentionally goofy in-world absence reason and that party member is treated as unavailable for that session window
- campaign availability in sidebar reflects host online/offline state

Broken down into sub-tickets m002.1-m002.12. This moonshot is considered vetted when all required criteria below are met.

Moonshot vetting criteria:
- join flow is low-friction and succeeds reliably with a simple command pattern
- host-authoritative AI routing is enforced (guests never invoke paid AI providers directly)
- multiplayer interaction latency is acceptable for turn/chat flow
- guest-to-party-member identity mapping remains consistent across reconnects and restarts
- `ai-able` toggle behavior is enforced correctly and consistently across reconnect/restart
- AI-controlled fallback behavior for absent `ai-able` guests preserves recognizable player-informed personality patterns
- non-`ai-able` absent guests always receive a clear, goofy DM absence explanation instead of AI autopilot
- sidebar host online/offline state is accurate and updates in near real-time
- reconnect and offline handling preserve campaign integrity and user clarity

m002.1 multiplayer architecture and authority model · m002.2 host-run campaign service lifecycle · m002.3 guest join command UX and parsing · m002.4 session discovery, invite token, and authentication model · m002.5 real-time chat and interaction event transport · m002.6 host-side AI routing and cost attribution guardrails · m002.7 multiplayer turn arbitration and conflict resolution · m002.8 sidebar host online/offline status for multiplayer campaigns · m002.9 reconnect, resume, and offline fallback behavior · m002.10 data persistence model for multiplayer session state · m002.11 security, abuse limits, and moderation controls · m002.12 moonshot validation runbook and go/no-go metrics
