# EPIC: DM turn review and gameplay loop routing

Review and rework the in-campaign turn loop so the **DM agent triages every player submission** before the app decides what to show. Today `turnIpc` always runs `interpretIntent` → engine resolution → `narrate` → a batch of NPC reactions chosen inside the narration JSON. That produces awkward beats — raw player chat in the feed, narration when the player only asked a question, and NPC dialogue buried after a scene paragraph they did not need.

After this epic, when the player types in the action panel the DM first **reviews what they are doing** (addressing someone, performing a visible action, or prompting scene narration) and routes the turn to one or more of three outcomes:

1. **NPC response** — call the NPC/creature agent for the targeted character(s) when the player is conversing with or provoking someone present in the scene. Speaking NPCs return italic dialogue; non-speaking creatures keep the bold action line from epic 028.
2. **DM narration** — the DM describes consequences, environment, and check outcomes when the moment calls for scene-setting or authoritative resolution copy. Engine resolution (checks, damage, rest, travel) still runs first; agents never invent outcomes.
3. **Player action expression** — render what the player character is physically doing as third-person prose in **bold** (same visual language as non-speaking creature actions), instead of echoing raw player chat for action beats.

A single turn may combine outcomes (e.g. express the sword draw, resolve an agility check, narrate the result, then let the goblin react) but the DM review step owns the ordering and which agents fire.

Broken down into sub-tickets 029.1–029.9. This epic is done when all of them are.

Definition of done:
- shared types document turn dispositions, routing rules, and composite-turn ordering
- DM turn-review agent call runs on every player submission and returns a validated routing plan
- `turnIpc` orchestrates NPC, narration, and action-expression paths from that plan — not the current always-narrate-then-batch-react sequence
- exposition feed shows bold player actions and no longer surfaces raw player input for action beats
- party-member beats follow the same routing rules
- smoke test covers conversation, a physical action line, and a narrated check outcome

029.1 turn-review spec + shared routing types · 029.2 DM turn-review agent prompt + schema · 029.3 turnIpc orchestration refactor · 029.4 targeted NPC response path · 029.5 player action expression (events + bold prose) · 029.6 DM narration path integration with engine resolution · 029.7 exposition feed rendering + ordering · 029.8 party-member routing alignment · 029.9 end-to-end gameplay-loop smoke test
