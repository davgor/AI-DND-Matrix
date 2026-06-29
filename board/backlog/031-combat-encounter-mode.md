# EPIC: Combat encounter mode (engine → turn loop → UI)

Wire the existing combat engine primitives into a real **encounter mode** that players can see and play through. Today initiative (`rollInitiative`), action economy (`useAction`), conditions, player weapon damage, and NPC-to-player attacks exist in isolation — but there is no persisted encounter state, NPCs have no HP/AC on the `npcs` row (attacks use hardcoded `+2` / `1d6`), the player cannot mechanically attack an NPC, and combat is triggered only as an ad-hoc `attack: true` flag on an NPC reaction outside initiative order.

After this epic, hostile scenes transition into a structured encounter: initiative is rolled once, turn order is enforced, the engine resolves attack rolls and damage authoritatively (player ↔ NPC, with equipped weapons and catalog creature stats where available), defeated NPCs are marked dead, and the play view shows who acts when with HP/condition visibility. Agents narrate outcomes; they never decide hit/miss or damage.

Epic 029 (turn routing) improves how combat beats are *presented* in the exposition feed; this epic owns the *mechanical* combat loop underneath. Implement 031 so routing hooks can attach later without rewriting encounter state.

Broken down into sub-tickets 031.1–031.11. This epic is done when all of them are.

Definition of done:
- shared types document encounter lifecycle, combatant identity, initiative order, and action-economy rules
- active encounter state and per-NPC combat stats persist in SQLite and survive restart
- catalog creature stats hydrate NPC combatants when retrieval supplies a canonical entry (epic 023)
- DM intent distinguishes combat start, player attack against a target, and encounter end
- `turnIpc` runs a combat branch: initiative at start, one action per turn, automatic NPC/party turns when not the player's slot
- player attacks resolve against NPC AC with equipped weapon damage; NPC attacks use persisted stats, not constants
- play view shows initiative order, active combatant, and HP/condition chips for visible combatants
- combat events append to the campaign event log for narration grounding
- smoke test resolves a full encounter (initiative, at least one hit and one miss, HP changes, encounter end)

031.1 combat encounter spec + shared types · 031.2 DB schema + repositories (encounter state + NPC combat stats) · 031.3 NPC combat stat hydration from catalog · 031.4 DM combat intent schema (start / attack / end) · 031.5 engine player attack resolution vs NPCs · 031.6 initiative + encounter lifecycle orchestration · 031.7 turnIpc combat branch + turn-order enforcement · 031.8 NPC and party combatant turn resolution · 031.9 combat state IPC + play-view HUD · 031.10 combat events + DM narration grounding · 031.11 end-to-end combat encounter smoke test
