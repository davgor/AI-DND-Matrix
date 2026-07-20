# EPIC: Moonshot m005 - remote play via PC-hosted local providers (Player2 / local LLM)

Enable a thin remote client (phone/web) to play against a user's always-on PC session, where the PC remains authoritative for campaign runtime, SQLite saves, rules engine, and AI provider calls. AI traffic routes only to the user's self-hosted options (Player2, future llama.cpp, or other local OpenAI-compatible endpoints) — not through developer-hosted LLM infrastructure.

Core concept:
- PC host owns engine, DB, agents, and provider selection (existing Electron main-process loop)
- remote client is a thin UI: send player actions, receive Scene/Social streams and sheet/state projections
- reachability is layered: same-LAN first, then user-owned tunnel (e.g. Tailscale / Cloudflare Tunnel), optionally a dumb shared relay for pairing only
- pairing uses short-lived invite codes / device tokens; raw Player2 (`localhost:4315`) is never exposed publicly
- developer cost target: **$0 LLM and $0 mandatory always-on game hosting**; any shared relay is optional, bandwidth-only, and replaceable by BYO tunnel
- distinct from m002: this moonshot is **single-player remote control of your own PC**, not multi-guest party multiplayer (reuse transport/auth ideas where safe; do not conflate product scope)

Broken down into sub-tickets m005.1–m005.12. This moonshot is considered vetted when all required criteria below are met.

Moonshot vetting criteria:
- host-authoritative play works end-to-end from a remote thin client while PC uses Player2 or local LLM only
- pairing is low-friction (code/QR) and rejects unauthenticated clients
- LAN and at least one non-LAN reachability path (BYO tunnel and/or optional relay) are proven
- PC offline / reconnect behavior is clear and does not corrupt saves
- security posture blocks open proxying of the local LLM endpoint and bounds abuse
- developer hosting requirement for a viable MVP can be **zero** (BYO tunnel) or explicitly capped to optional cheap relay with documented cost envelope
- relationship to m002 is documented (shared primitives vs separate product surfaces)

m005.1 remote-play architecture and authority model · m005.2 PC remote-play agent and session lifecycle · m005.3 reachability modes (LAN, BYO tunnel, optional relay) · m005.4 pairing invite codes and device auth · m005.5 thin remote client play surface · m005.6 local-provider routing guardrails (Player2 / llama) · m005.7 action transport and narration/state sync protocol · m005.8 reconnect PC-offline and session resume · m005.9 security abuse limits and endpoint isolation · m005.10 zero-hosting cost envelope and relay policy · m005.11 boundary with m002 multiplayer · m005.12 moonshot validation runbook and go/no-go metrics
