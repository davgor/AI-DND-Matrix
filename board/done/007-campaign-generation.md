# EPIC: Campaign generation from a prompt

Broken down into sub-tickets 007.1-007.4. This epic is done when all of them are.

007.1 structured generation call · 007.2 parse regions/history · 007.3 parse NPCs/threads · 007.4 reject malformed output

The review/edit UI (originally 007.5) moved to ticket 009.7 — it depends on character creation as its "continue" destination and on IPC/navigation scaffolding that doesn't exist until that epic, so it belongs there instead.

## Sub-tickets

### 007.1 Campaign generation: structured DM-agent call

#### Description
Implement the one-shot structured generation call: a free-text premise prompt produces 2-4 regions, NPCs, a main story thread, and a starting scenario.

#### Acceptance Criteria
- [x] Submitting a prompt produces a single structured response containing 2-4 regions, at least 2 NPCs, and one main story thread
- [x] Unit tested against a mock provider returning a valid structured response

### 007.2 Campaign generation: parse regions + region_history into DB

#### Description
Parse the generated regions into `regions` rows, each with a preseeded `region_history` backstory entry.

#### Acceptance Criteria
- [x] Each generated region is written to `regions`, linked to the new campaign
- [x] Each region gets at least one `region_history` entry seeded from the generation response
- [x] Unit tested with a sample structured response

### 007.3 Campaign generation: parse NPCs + story threads into DB

#### Description
Parse the generated NPCs and main story thread into their respective tables.

#### Acceptance Criteria
- [x] Each generated NPC is written to `npcs`, linked to its region and campaign
- [x] The main story thread is written to `story_threads`, linked to the campaign
- [x] Unit tested with a sample structured response

### 007.4 Campaign generation: reject malformed output

#### Description
Ensure a malformed/incomplete generation response is rejected and retried rather than partially persisted.

#### Acceptance Criteria
- [x] A malformed mock response causes a retry, not a partial write to any table
- [x] Unit tested: after a malformed-then-valid sequence, exactly one complete campaign exists, no partial rows from the failed attempt
