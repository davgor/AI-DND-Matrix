# EPIC: Combat flee resolution

Give the player a real way to run from a fight. Epic 031 names `flee` as a combat-intent value but never implements it — there is currently no check, no consequence, and no narration path for an escape attempt.

Fleeing is not a single switch that instantly clears the encounter. When the player's free text reads as an attempt to escape ("I bolt for the door", "we need to get out of here"), the DM recognizes that intent, but **whether they actually get away is resolved in two layers**: the engine rolls a deterministic disengage check (Agility-based, contested against the most threatening engaged hostile) every time a flee is attempted — agents never decide hit/miss the way they never decide attack outcomes. Winning that roll only proves the player isn't cut off *this turn*; it does not by itself end the encounter, since hostiles can still be in the room, blocking an exit, or able to pursue. The DM agent's job is the part the engine can't model: given the resolved roll outcome plus scene context (what's actually being fled from and toward), it judges whether this turn's successful disengage means they've cleared the threat entirely or merely bought another round of pursuit — bounded strictly so it can only narrate "fully escaped" on top of an engine-confirmed successful roll, never instead of one.

A failed disengage check costs the player's action for the turn and the encounter continues normally (hostiles act, turn order advances). A successful check that the DM judges as full escape ends the player's part of the encounter — but does not automatically resolve combat for AI party members still present, who keep fighting, retreat with the player, or get left behind per their own routing.

Broken down into sub-tickets 033.1-033.8. This epic is done when all of them are. Builds on epic 031's combat-intent schema and turn loop; requires 031's combat branch to exist first.

Definition of done:
- shared types document flee intent, the disengage check, and partial- vs full-escape state
- engine resolves the disengage check deterministically; provider output cannot set success/failure
- DM combat-intent classification recognizes freeform "trying to flee" text without requiring an exact command
- a failed flee attempt consumes the turn and leaves the encounter active; a successful one doesn't necessarily end it without the DM's bounded escape judgment
- party members left in an encounter the player fled continue to resolve their own turns
- exposition feed and combat HUD distinguish "fleeing, still pursued" from "escaped" from "flee failed"
- smoke test covers a failed attempt, a successful disengage that doesn't clear the encounter, and a full escape

033.1 flee resolution spec + shared types · 033.2 engine disengage-check resolution · 033.3 DM combat-intent flee classification · 033.4 turnIpc flee branch + partial encounter exit · 033.5 DM escape-narration path (bounded by engine outcome) · 033.6 pursuit and party-member continuation after player exit · 033.7 exposition feed + HUD flee states · 033.8 end-to-end flee smoke test
