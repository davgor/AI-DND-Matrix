# EPIC: Moonshot m001 - image generation for DM/player backgrounds + character consistency

Use image generation to drive visual storytelling in campaign play:
- seed region/location background images during campaign creation
- update DM exposition background when scene context changes
- update player-view background each turn while preserving campaign visual coherence
- generate and persist character visuals for both NPCs and player party

Provider strategy: both local and cloud with fallback.

Broken down into sub-tickets m001.1-m001.12. This moonshot is considered vetted when all required criteria below are met.

## Character / image work split (epics 122 + 123)

Moonshot **m001** character and token imagery is split by surface so each epic stays shippable:

| Category | Tracking |
|----------|----------|
| **NPC face tokens** (Social avatar + dossier portrait) | Implementable epic **122** — first slice promoted from m001 (file `122-…`; body still uses legacy **121.x** sub-ids) |
| **Enemy / combat creature tokens** | Implementable sibling epic **123** |
| **Scene / region / DM / player backgrounds** | Remains **m001.2**–**m001.5** (and related m001 sub-tickets) |
| **Player-party character visuals** | **m001.6** remaining scope + shared pipeline with m001.7–m001.9 |

Epic **122** owns NPC face-token generation, persistence, and UI surfaces only. Epic **123** owns enemy/combat creature tokens.

Moonshot vetting criteria:
- consistency across sessions is strong (same characters/locations remain recognizably stable)
- visual quality is acceptable for in-game immersion
- generation speed is fast enough to avoid disrupting turn flow
- fallback behavior between local/cloud providers is deterministic and safe
- generated assets persist and reload correctly after restart

m001.1 image generation architecture + provider fallback contract · m001.2 campaign-time region/location seed image generation · m001.3 DM exposition background on scene-change updates · m001.4 player-view background refresh per turn with coherence guards · m001.5 visual style system (campaign preset + per-scene override) · m001.6 character visual generation pipeline (player party + shared pipeline; **NPC face tokens → epic 122**; **enemy/combat tokens → epic 123**) · m001.7 character consistency data model + persistence · m001.8 asset storage/cache strategy and lifecycle · m001.9 generation queueing/performance budget + async UX · m001.10 failure handling, fallback, and deterministic recovery · m001.11 moderation/safety and prompt sanitization policy · m001.12 moonshot validation runbook and go/no-go metrics
