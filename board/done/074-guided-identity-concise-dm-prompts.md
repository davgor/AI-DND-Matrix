# 074 — Guided identity: concise DM questions (no verbatim restates)

During the Who / Why / Where / What interview, the DM often restates the player's locked answer in florid prose before asking the next foundation (e.g. a long "Your Why surges…" paraphrase, then a full dump of every region description). That wastes tokens and makes the chat harder to answer. `dmReply` should stay short: briefly acknowledge if needed, then ask the next question — never re-narrate sealed foundations or paste full region blurbs.

## Acceptance criteria

- [x] Identity kickoff and interview system prompts instruct concise `dmReply`s: prompt the next question; do not restate locked foundation summaries verbatim or in purple paraphrase
- [x] Where prompts tell the DM to offer region choices by name with at most a short distinguishing phrase — not full catalog descriptions
- [x] Unit tests assert the new concise-reply / no-restate language appears in kickoff and interview prompts
- [x] `npm test`, `npm run lint`, and `npm run build` pass
