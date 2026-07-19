# 085 — Social column text stream (NPC + player chat)

Make the play-view player column a **Social** stream so NPC and player communications live there as a chat-style text feed, with profile-icon bubbles for speakers. Scene column keeps DM narration and physical/action beats.

## Acceptance criteria

- [x] `filterDmExpositionEntries` / social filter split: Scene keeps DM + player action expressions + NPC/creature **action** reactions; Social gets player raw input + NPC/party **dialogue**
- [x] Player column heading is **Social** (not “Your Actions”); aria-label reflects social stream
- [x] Social feed renders as a text/chat stream with avatar bubbles (initial-letter fallback) for NPC and party speakers
- [x] Player lines appear distinctly in the same stream; composer stays pinned at the bottom
- [x] Unit tests cover the new filter split and social message rendering helpers
- [x] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
