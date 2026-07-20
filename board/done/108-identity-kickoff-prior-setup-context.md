# 107 — Identity kickoff knows prior player setup

The identity interview opening question ("Tell me about yourself" / Who) should be grounded in everything the player already chose before that step: mechanical sheet, race/lore, background/story, starting gear, and known spells. Today the kickoff prompt often invents a cold-open scene (ruin, humming sword, etc.) instead of treating setup choices as established facts.

## Acceptance criteria

- [x] Identity interview context includes starting gear (item names + equipped slots) and known spell names from the character record
- [x] Identity kickoff system prompt includes those facts and instructs the DM to ground the Who question in established setup — not invent an opening scene (scene-setting belongs in the later opening-scene phase)
- [x] Unit tests cover gear/spell inclusion in the kickoff prompt and the no-invented-scene grounding rule
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
