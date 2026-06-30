# EPIC: Campaign hub, multi-character cast, and shared-world continuity

When a player selects a campaign that already has **at least one player character with `guided_creation_phase === 'complete'`**, stop jumping straight into `PlayView`. Instead, land on a **Campaign Hub**: a read-only, play-aware world preview in the center, a **character cast rail** on the right, and the existing campaign sidebar on the left. From here the player can review how the world has evolved, generate new regions, select a living character to resume play, view a dead character's obituary, or start the full new-character flow (mechanical setup → guided identity → opening scene).

This epic introduces **multiple fully playable player characters per campaign**, all inhabiting the **same live world at the same time** (unless a character is dead). World state — regions, NPCs, story threads, events, `current_state_summary` — remains **campaign-level**. Per-character state — `currentRegionId`, journal, log book, guided-creation fields, party roster, turn/narration history — is **character-scoped**. When the active player character encounters another **living but inactive** player character, the inactive one is **AI-driven** from their own history (narration log, journal, log book, identity summaries); interactions are **persisted to both characters' log books** so each protagonist retains context when their story is resumed later. AI party members can be **shared** across rosters; recruiting a hero from another character's party **transfers** that `ai_party_member` row to the recruiter's roster.

Campaigns still in onboarding (no player character, or guided creation incomplete) keep today's behavior — `CampaignReview` → `CharacterSetup` → guided creation — unchanged.

Onboarding `CampaignReview` stays **editable** for first-time setup. The hub is a **new screen** (`CampaignHub`) that reuses shared presentational components (region cards, story section, generate-region modal) in **read-only, play-aware** mode — do not bolt hub behavior onto the onboarding review as a dual-mode mess.

**Death & obituaries:** Persist durable death status on player characters (legendary permanent death, respawn limit exhausted, execute defeat under legendary, and **story-driven death** such as a valiant sacrifice — even under Standard mode where combat death normally reverts). Dead characters show a **skull and crossbones** before their name on the cast rail. Obituaries are **AI-generated at the moment of death** (modal: **"Drafting your obituary"**), grounded in how they died plus journal/log-book history and reactions from NPCs they had positive or negative history with. Obituary text is **persisted, not player-editable**. On the hub, viewing an obituary opens a **blocking modal** that must be dismissed before selecting or creating another character.

**Region generation:** Hub "Generate another region" reuses the additional-region pipeline but the agent must be grounded in **full campaign history** (existing regions + `region_history`, story-thread states/summaries, `current_state_summary`, recent world-altering events) — not just premise + region names. During play, when a player travels to a **destination that does not exist yet**, trigger the same generation path with a **loading modal** informing them the place is being created.

Builds on **007** (campaign generation), **009** (character creation + review), **025** (log book), **026** (guided creation), **011** (NPC/party promotion patterns), **010** (play loop / per-character `currentRegionId`).

Broken down into sub-tickets **038.1–038.19**. This epic is done when all of them are.

Definition of done:
- selecting a "ready" campaign opens `CampaignHub` instead of `PlayView`
- hub shows play-aware read-only world snapshot + cast rail with skull/obituary for dead characters
- player can resume any living character, create a new one (full guided flow), or generate a region from the hub
- multiple player characters coexist in one world; inactive living characters are AI-proxyable with cross-character log-book persistence
- party roster ownership + cross-roster recruitment transfer works
- death status + obituary generated at death; hub obituary modal blocks cast actions until dismissed
- mid-play travel to ungenerated areas triggers generation with player-facing loading UX
- end-to-end smoke test covers hub entry, second character creation, cross-character encounter, death/obituary, and travel-triggered region seeding

038.1 spec + shared types · 038.2 DB schema (death, obituary, party ownership) · 038.3 death status persistence + story-driven death hook · 038.4 obituary agent + generation pipeline · 038.5 death-time obituary drafting modal · 038.6 onboarding stage routing + hub gate · 038.7 hub IPC + play-aware world snapshot · 038.8 CampaignHub layout shell · 038.9 read-only play-aware world preview · 038.10 cast rail (select, skull, new character) · 038.11 hub obituary view modal (blocking) · 038.12 active character selection through play shell · 038.13 per-character party roster + cross-roster transfer · 038.14 inactive player-character AI proxy + encounter grounding · 038.15 cross-character interaction log-book writes · 038.16 campaign-history-aware region generation (hub) · 038.17 mid-play travel to ungenerated region + loading modal · 038.18 new character from hub (full guided flow) · 038.19 end-to-end smoke test
