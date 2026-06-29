# EPIC: Character creation + party setup UI

Broken down into sub-tickets 009.1-009.7. This epic is done when all of them are.

009.1 core form fields · 009.2 portrait/background upload · 009.3 submit + derived stats/currency · 009.4 AI party member setup · 009.5 death mode/respawn rules selection · 009.6 form validation · 009.7 campaign review/edit UI (moved from 007.5 — runs before 009.1 in the actual UX flow; see that ticket for why)

## Sub-tickets

### 009.1 Character form: name/archetype/ability scores

#### Description
Build the core character-creation form fields: name, seed archetype selection, and ability score assignment via any of the three generation methods.

#### Acceptance Criteria
- [x] Player can enter a name and pick one of the five seed archetypes
- [x] Player can choose point buy, standard array, or roll-for-stats and assign the four ability scores accordingly

### 009.2 Portrait + sheet-background image upload

#### Description
Allow uploading a character portrait and a sheet-background image during character creation.

#### Acceptance Criteria
- [x] Player can select and upload a portrait image, copied into app data with its path stored on the character
- [x] Player can select and upload a sheet-background image, same persistence pattern

### 009.3 Character submit: derived stats + starting currency

#### Description
Submitting the form creates a `characters` row of kind `player` with engine-computed derived stats and a starting currency value.

#### Acceptance Criteria
- [x] Submission computes HP and AC via the engine functions (004.7, 004.8) from the chosen archetype/scores
- [x] A starting currency value is set on the new character row

### 009.4 AI party member setup UI

#### Description
Allow adding zero or more AI party members (name/class/personality) during the same setup flow.

#### Acceptance Criteria
- [x] Player can add any number of AI party members, each with name/class/personality fields
- [x] Each becomes a `characters` row of kind `ai_party_member` on submission

### 009.5 Death mode + respawn rules selection UI

#### Description
Let the player choose the campaign's death mode and, if Respawn, define its respawn rules.

#### Acceptance Criteria
- [x] Player chooses Legendary, Standard, or Respawn for the campaign
- [x] Choosing Respawn requires defining location, cost, and limits before continuing
- [x] Selections are persisted on the `campaigns` row

### 009.6 Character creation form validation

#### Description
Validate required fields before allowing the character-creation form to be submitted.

#### Acceptance Criteria
- [x] Submission is blocked until name, archetype, and all four ability scores are set
- [x] Attempting to submit an incomplete form shows a clear validation message

### 009.7 Campaign generation: review/edit UI

#### Description
Build the UI step where the player reviews and can edit the generated campaign summary (from ticket 007.1-007.4) before character creation. Originally ticket 007.5 — moved into this epic because it depends on character creation (this epic) as its "continue" destination and naturally belongs to the character-creation onboarding flow, not the generation epic. In the actual UX flow this screen runs *before* 009.1-009.6 even though it's numbered after them (numbering reflects ticket creation order, not UX order, per this repo's ticket-board convention). Needs renderer↔main IPC for invoking campaign generation/persistence and editing the result — this is the first ticket in the renderer that needs that wiring, so it also establishes the pattern epic 008 (sidebar) will reuse for its own campaign data needs.

#### Acceptance Criteria
- [x] After generation, a summary screen shows the generated regions/NPCs/story thread
- [x] Player can edit text fields (e.g. region/NPC descriptions) before continuing; edits are persisted
- [x] Continuing from this screen proceeds to character creation (ticket 009.1)
