# EPIC: Agent orchestration (DM, NPC, party-member agents)

Broken down into sub-tickets 006.1-006.13. This epic is done when all of them are.

006.1 DM intent interpretation · 006.2 DC clamp integration · 006.3 DM narration call · 006.4 world_fact emission · 006.5 story_thread update · 006.6 NPC context isolation · 006.7 party-member relationship context · 006.8 DM homebrew flavor proposal · 006.9 region-history compression job · 006.10 provider config wiring · 006.11 retry/backoff + failure logging · 006.12 mock provider test harness · 006.13 context recency-window enforcement

## Sub-tickets

### 006.1 DM agent: intent-interpretation schema + validation/retry

#### Description
Implement the DM agent's intent-interpretation call: free-text player input in, a constrained schema out (ability, DC, proficiency boolean, or no-check-needed).

#### Acceptance Criteria
- [x] The call's output is validated against a fixed schema; malformed/out-of-schema responses are rejected and retried, never passed to the engine
- [x] Unit tested with a mock provider returning both valid and invalid schema shapes

### 006.2 DC clamp integration between DM agent and engine

#### Description
Wire the engine's DC clamp (ticket 004) into the path between the DM agent's proposed DC and the actual check resolution.

#### Acceptance Criteria
- [x] A DC proposed outside the sane range (e.g. 5-30) by a mock DM response is clamped before being used in check resolution
- [x] Unit tested with a mock response proposing an out-of-range DC

### 006.3 DM agent: narration call wiring

#### Description
Implement the DM agent's narration call: given the engine's resolution plus a freshly-pulled world-state snapshot, produce narration text.

#### Acceptance Criteria
- [x] The narration call's context includes region status, recent events, and story thread state pulled fresh from the DB at call time
- [x] Unit tested that the narration call never receives a hand-invented pass/fail/damage value — only the engine's actual resolution result

### 006.4 DM agent: world_fact emission handling

#### Description
Allow the DM agent's narration response to optionally include a new world_fact, persisted when present.

#### Acceptance Criteria
- [x] When the narration response includes a world_fact (content + region/faction tags), it's persisted via the db repository as part of resolving that turn
- [x] When absent, no world_fact row is created
- [x] Both cases unit tested with a mock provider

### 006.5 DM agent: story_thread update handling

#### Description
Allow the DM agent's narration response to optionally update a story_thread's state/summary.

#### Acceptance Criteria
- [x] When the narration response includes a story_thread update, it's persisted via the db repository
- [x] When absent, the thread is left unchanged
- [x] Both cases unit tested with a mock provider

### 006.6 NPC agent: context assembly + memory isolation

#### Description
Implement the NPC agent's context assembly: only that NPC's own npc_memories plus world_facts tagged to its region/faction.

#### Acceptance Criteria
- [x] Context assembly for NPC A never includes NPC B's memory rows, even when both are seeded in the same test
- [x] world_facts included are limited to those tagged to the NPC's region/faction
- [x] Unit tested with seeded multi-NPC data

### 006.7 Party-member agent: persistent relationship context

#### Description
Implement the party-member agent's context assembly, including persistent relationship/history toward the player across the whole campaign (not just the current scene).

#### Acceptance Criteria
- [x] Context assembly includes relationship/history data spanning prior sessions, not just the current scene's recent events
- [x] Unit tested with seeded history from an earlier "session" showing it's still included in a later call's context

### 006.8 DM agent: homebrew flavor proposal call

#### Description
At level-up, when the engine's emergent-direction detection (004.22) returns a candidate, call the DM agent to propose flavor (name/description/damage type) constrained to that level's mechanical template (004.23).

#### Acceptance Criteria
- [x] When a candidate exists, the DM agent is called and its response is constrained to flavor-only fields (no numeric override accepted)
- [x] When no candidate exists, no homebrew call is made
- [x] Both cases unit tested with a mock provider

### 006.9 Region-history compression job

#### Description
Implement the job that takes compression candidates (from the db query in 003.4) and summarizes them via the provider into a shorter, compressed region_history entry.

#### Acceptance Criteria
- [x] Given candidate entries, the job calls the provider to summarize them and writes back a new entry with `is_compressed = true`
- [x] Original detailed entries are excluded from future context assembly once compressed
- [x] Unit tested against a mock provider

### 006.10 Provider config wiring (.env-driven swap)

#### Description
Wire provider selection (Player2/Claude/etc.) to runtime config so swapping providers requires no code change.

#### Acceptance Criteria
- [x] Provider choice is read from `.env`/config at startup and used to select which adapter implementation backs the agents
- [x] Unit tested: running the same agent call against two different mock providers selected purely via config produces calls to the correct mock

### 006.11 Retry/backoff + unreachable error + local log on failure

#### Description
Implement retry-with-backoff for provider calls, surfacing a typed "unreachable" error after repeated failure, and writing the failure to the local log file.

#### Acceptance Criteria
- [x] A failing mock provider call is retried a small fixed number of times with backoff before giving up
- [x] After exhausting retries, a typed "unreachable" error is returned/thrown rather than hanging or throwing uncaught
- [x] The failure is written to the local log file (ticket 001.9), unit tested

### 006.12 Mock provider test harness

#### Description
Build a shared, scripted mock provider used across all agent tests so no automated test ever calls a real LLM.

#### Acceptance Criteria
- [x] A reusable mock provider supports scripting fixed responses (including malformed-schema responses) per test
- [x] All other agent tickets' tests (006.1-006.9) use this shared harness rather than duplicating mock logic

### 006.13 Context assembly recency-window enforcement

#### Description
Enforce the recency-window + relevance-tag rule across all agent context assembly: bounded number of memory/event entries, never a full-history dump.

#### Acceptance Criteria
- [x] Context assembly caps the number of npc_memories/region_history/events entries included, regardless of how much history exists
- [x] Unit tested with a large seeded history (e.g. hundreds of entries) confirming the assembled context stays within the defined bound
