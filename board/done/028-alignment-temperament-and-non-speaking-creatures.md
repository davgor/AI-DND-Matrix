# EPIC: Alignment, temperament, and non-speaking creature actions

Add **alignment** as a first-class character attribute. Player alignment is chosen once during character setup (name + stat selection) via a dropdown and is **static from the player's perspective** — it is not editable in the character sheet or setup replay. Only the **DM agent** can change a player character's alignment at runtime, and only through a deliberate two-step flow: first flag a pending alignment shift with a warning, then commit the new alignment if the player continues with the action that would cross the line.

For NPCs and catalog creatures/monsters, add **temperament** and a **can speak** flag. Alignment captures moral/ethical stance for sentient entities; **disposition** (already on NPCs) stays the relationship toward the player; **temperament** describes scene behavior (aggressive, skittish, territorial).

When `canSpeak` is false, the NPC/creature agent emits third-person **action descriptions** wrapped in markdown bold (`**…**`), rendered bold in the exposition feed. Speaking NPCs and party members keep italic dialogue as today.

When the DM flags a pending alignment shift, the **DM exposition pane** shows a high-visibility warning (striking color, `role="alert"`) with the DM's warning copy — e.g. that the player may no longer be their current alignment if they proceed. The player may still submit their next action; if they do, the DM may commit the alignment change on that turn.

Broken down into sub-tickets 028.1–028.10. This epic is done when all of them are.

Definition of done:
- shared types document alignment, temperament, `canSpeak`, and the pending-shift / commit flow
- player alignment set only at character setup; read-only everywhere else for the player
- DM narration schema supports `alignmentShiftWarning` and `commitAlignmentShift`
- exposition UI shows a striking alignment-shift warning banner while a shift is pending
- non-speaking creatures render bold action lines; speaking NPCs stay italic
- smoke test covers setup alignment, a pending warning, and a committed shift on continued play

028.1 alignment/temperament/speech spec + shared types · 028.2 DB schema + repositories · 028.3 player alignment dropdown at character setup (static after) · 028.4 campaign generation NPC fields · 028.5 catalog creature seed temperament + canSpeak · 028.6 NPC/creature agent reaction schema · 028.7 narration log + exposition UI (bold action + alignment warning banner) · 028.8 character sheet display + campaign review NPC edit · 028.9 end-to-end smoke test · 028.10 DM alignment-shift warning flag and commit on continued play
