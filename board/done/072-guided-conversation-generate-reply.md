# 072 — Guided DM questionnaire: Generate reply draft

Add a **Generate** button next to **Send** on the guided creation DM conversation composer (identity interview and opening-scene phases). Pressing it drafts a player reply into the textarea using everything already known about the character plus the conversation transcript — without sending. The draft stays fully editable.

## Acceptance criteria

- [x] Composer shows a **Generate** button beside **Send** during identity and opening-scene guided conversations
- [x] Generate calls a new `guidedCreation:generateReply` IPC that grounds the draft in character facts (name, class, scores, alignment, race/lore, background/story, locked foundations / opening-scene identity as applicable), campaign premise, and the phase transcript (especially the latest DM question)
- [x] Successful generation replaces the composer text with plain player-voice prose; it does not append transcript messages or advance the phase
- [x] Generate is disabled while sending, generating, or when the phase is complete; failures surface an error without clearing a prior draft on soft failure paths where applicable
- [x] Agent prompt builder + IPC path are unit-tested; `npm test`, `npm run lint`, and `npm run build` pass
