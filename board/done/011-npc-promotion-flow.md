# EPIC: NPC promotion flow

Broken down into sub-tickets 011.1-011.5. This epic is done when all of them are.

011.1 confirmation prompt UI · 011.2 decline path · 011.3 confirm + conversion · 011.4 memory carry-forward · 011.5 mark NPC promoted

## Sub-tickets

### 011.1 Promotion-flag detection + confirmation prompt UI

#### Description
Surface a DM-flagged NPC recruitment proposal as a player-facing confirmation prompt, rather than applying it silently.

#### Acceptance Criteria
- [x] When the DM agent's narration flags a proposed promotion, the UI shows a confirmation prompt naming the NPC
- [x] No promotion happens until the player responds to the prompt

### 011.2 Promotion decline path

#### Description
Handle declining a proposed NPC promotion.

#### Acceptance Criteria
- [x] Declining the prompt leaves the NPC unchanged (still a regular NPC, `is_party_member` false)
- [x] Unit tested

### 011.3 Promotion confirm path: NPC to party-member conversion

#### Description
On confirmation, convert the NPC into a party-member character with stats generated from its persona/role.

#### Acceptance Criteria
- [x] Confirming creates a new `characters` row of kind `ai_party_member` with `source_npc_id` set to the original NPC
- [x] Stats are generated from the NPC's existing persona/role via the engine

### 011.4 Promotion memory carry-forward

#### Description
Carry the NPC's prior memory log forward as the new party member's starting history.

#### Acceptance Criteria
- [x] The promoted character's initial party-member agent context includes at least one pre-promotion `npc_memories` entry
- [x] Unit tested

### 011.5 Mark original NPC as promoted

#### Description
Mark the original NPC row as promoted so it's no longer driven by the generic NPC agent.

#### Acceptance Criteria
- [x] The original `npcs` row has `is_party_member` set to true after promotion
- [x] Subsequent scene resolution routes that character through the party-member agent, not the NPC agent
