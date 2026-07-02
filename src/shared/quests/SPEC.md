# Quest log

Structured per-character objective tracking for the main story arc and optional side quests. Distinct from the log book (established knowledge), journal (first-person notes), and `story_threads` (DM agent narrative arc state).

## Types

| Type | Values / shape |
|------|----------------|
| `QuestKind` | `main` \| `side` |
| `QuestStatus` (per character) | `available` \| `active` \| `completed` \| `failed` \| `abandoned` |
| `QuestScale` | `minor` \| `major` (shared with loot/XP) |
| `QuestObjective` | `{ id, text, done }` checklist |

## Records

**`Quest`** (campaign-scoped): `id`, `campaignId`, `kind`, `title`, `summary`, `hookLine`, `storyThreadId?`, `premiseAnchor?`, `regionId?`, `sourceWorldFactId?`, `scale`, `objectives[]`, `createdAt`.

**`CharacterQuest`** (per player character): `characterId`, `questId`, `status`, `acceptedInGameDate?`, `completedInGameDate?`, `playerNotes?`, `updatedAt`.

## Decisions (045.1)

1. **Main quest auto-accept:** `active` on character creation / guided-creation complete — the premise hook is always tracked.
2. **Cross-character visibility:** side quests accepted by Character A are **not** shown as `active` to Character B; each character has isolated `character_quests` rows. Hub may show aggregate counts for the selected character only.
3. **Objectives:** structured `{ id, text, done }` checklist; DM/agent toggles `done`; players see read-only checklists in v1.

## Premise linkage

```
campaigns.premise_prompt
        │
        ▼
main quest.hookLine  (excerpt / full premise)
main quest.storyThreadId ──► story_threads row from generation
```

On campaign generation, one `main` quest is created from `storyThread.title` / `summary` with `hookLine` from `premise_prompt`. Each player character gets `character_quests.status = active` for that quest when they complete guided creation.

## Story thread sync

| Event | Main quest row | Rewards |
|-------|----------------|---------|
| DM `storyThreadUpdate` on linked thread | Sync `title`, `summary`; if terminal state (`completed`/`resolved`/`done`), set character main quest `completed` | Fire XP/loot **once** via linked `questId` |
| DM `questCompletions` with `questId` | Set character quest `completed` | Fire XP/loot via `questId` |
| Both on same turn | Dedupe by `questId` — only one reward pass |

`story_threads` remains the DM agent's narrative arc; the main quest **mirrors** it for the player-facing log.

## Side quest promotion

Region `world_facts` with `faction_tag = 'quest_hook'` become `side` quests at campaign generation (`source_world_fact_id` set, `region_id` linked). Per character: `character_quests.status = available` until the player accepts/tracks.

DM `questProposals` may create additional side quests; proposals referencing an existing `source_world_fact_id` reuse the row (no duplicate).

## vs log book / journal

| System | Purpose |
|--------|---------|
| Quest log | Actionable objectives — *what am I trying to do?* |
| Log book | Established knowledge — *what do I know?* |
| Journal | Personal reflection — *how did that feel?* |

Quest completion may emit a log book `event` entry with `relatedEntityId = questId`; quest log does not store encyclopedic prose.

## Completion → rewards

`LootContext` / `XPContext` use `questId` + `questScale` (and `questHookText` from quest summary). `questThreadId` is legacy for story-thread-only paths; new code prefers `questId`.

## Narration context windowing

`MAX_ACTIVE_QUESTS_IN_CONTEXT = 3` — inject acting character's `active` quests only (not `available` / `abandoned`). Priority: main story first, then most recently accepted side quests by `acceptedInGameDate`.

## Worked examples

### Premise → main quest

- Premise: *"You owe a debt to the thieves' guild in Port Ash."*
- Generated story thread: title *"The Ash Debt"*, state `active`, summary *"Settle or defy the guild."*
- Main quest: `hookLine` = premise, `title` = thread title, character status `active`.

### Region hook → side quest

- `quest_hook` fact: *"Strange lights in the old mill."*
- Side quest: title from first sentence, `regionId` set, character status `available` until Accept/Track.

### Completion → XP

- Character accepts side quest → `active`.
- DM `questCompletions: ["<questId>"]` → status `completed`, `runQuestXpPass` + `runQuestLootPass` with `questId` and `scale`.
