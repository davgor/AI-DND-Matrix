# Campaign hub, multi-character cast, and shared-world continuity

## Screen model

**Campaign Hub** is a **new screen** (`CampaignHub`), not a mode flag on onboarding `CampaignReview`. Onboarding review stays editable for first-time setup. The hub reuses shared presentational components (region cards, story section, generate-region modal) in **read-only, play-aware** mode.

Layout: existing campaign sidebar (left) + center world preview + right character cast rail.

## Hub eligibility

A campaign is hub-eligible when:

```ts
characters.some(c => c.kind === 'player' && c.guidedCreationPhase === 'complete')
```

Otherwise existing onboarding routing applies unchanged (`CampaignReview` → `CharacterSetup` → guided creation).

## Authority boundaries

| Concern | Authority |
| --- | --- |
| `life_status`, `death_cause`, `died_at` | Engine/main on death resolution |
| `obituary_json` | Obituary agent at death; persisted atomically with death |
| World state (regions, NPCs, story threads, `current_state_summary`) | Campaign-level; shared by all living characters |
| Per-character state (`currentRegionId`, journal, log book, narration log, party roster) | Character-scoped |
| Hub preview | Read-only UI over `PlayAwareHubSnapshot` IPC |
| Inactive player proxy | Agent reads inactive character SQLite history; engine validates mechanical changes |

## Character life status

`CharacterLifeStatus`: `alive` | `dead` (default `alive`).

Death triggers (engine sets `life_status = dead`):

- **Legendary**: lost dying sequence
- **Respawn**: respawn limit exhausted
- **Execute defeat** under legendary death mode
- **Story-driven death** (`story_sacrifice`): DM narration schema flag `storyDrivenDeath` — persists even under Standard mode where combat death normally reverts via save snapshot

Standard-mode **combat** death still reverts — no death flag.

Dead characters do not enter play but remain on the cast rail with skull icon and obituary access.

## Obituary

`CharacterObituary`: `{ generatedAt, deathCause, narrativeBody, npcReactions[] }` — persisted on character, not player-editable. Generated synchronously at death before play UI unblocks.

## Party roster

Each `ai_party_member` has `owner_player_character_id` (nullable FK → player character).

- First character setup may create **shared** members (`owner` null)
- `listPartyMembersForPlayer` returns owned + shared members
- Recruitment from another player's roster **reassigns** `owner_player_character_id`

## Inactive player proxy

When active character A encounters living inactive player B in the shared world, an agent path speaks/acts for B grounded in: narration log, journal, log book, identity summaries, `currentRegionId`, public campaign state.

## Cross-character log-book writes

Narration schema supports `crossCharacterLogBookEntries: CrossCharacterLogWrite[]` — paired entries persisted to multiple character ids in one transaction.

## Play-aware hub snapshot

`PlayAwareHubSnapshot` extends campaign detail with `currentStateSummary`, story-thread live state/summary, region extras from `region_history`, and cast entries with life status and obituary presence.

**Session leave-off (epic 124):** the hub world preview shows a **Session recap** section (auto-generated “previously on…” prose), not a raw Recent events list. Contract, freshness gate, and empty-events copy live in `src/shared/sessionRecap/`. Recap text is loaded via `campaigns:getOrGenerateSessionRecap` on hub boot — not via `PlayAwareHubSnapshot`.

## Ungenerated travel

When travel targets a place with no region row, block travel, show loading modal, run history-aware region generation, then complete travel.
