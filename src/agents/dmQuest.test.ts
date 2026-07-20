import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createStoryThread } from '../db/repositories/storyThreads'
import { createWorldFact } from '../db/repositories/worldFacts'
import {
  getCharacterQuest,
  getMainQuestByCampaign,
  getQuestById,
  getQuestBySourceWorldFactId,
  seedCharacterQuestMembership,
  seedMainQuestForCampaign
} from '../db/repositories/quests'
import { persistQuestNarrationSideEffects } from './questNarration'
import type { QuestProposal } from './questNarration'

function seedPlayer(db: Database.Database): { campaignId: string; characterId: string } {
  const campaign = createCampaign(db, { name: 'Q', premisePrompt: 'Hook', deathMode: 'legendary' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  return { campaignId: campaign.id, characterId: player.id }
}

function proposeSide(
  db: Database.Database,
  ids: { campaignId: string; characterId: string },
  proposal: QuestProposal
): void {
  persistQuestNarrationSideEffects(
    db,
    { narrationText: 'A job offer.', questProposals: [proposal] },
    ids
  )
}

describe('persistQuestNarrationSideEffects proposals', () => {
  it('persists quest proposals for the acting player', () => {
    const db = createTestDb()
    const ids = seedPlayer(db)
    proposeSide(db, ids, {
      kind: 'side',
      title: 'Deliver package',
      summary: 'Take the package to the docks.',
      scale: 'minor'
    })
    const questRow = db.prepare('SELECT id FROM quests LIMIT 1').get() as { id: string }
    expect(getCharacterQuest(db, ids.characterId, questRow.id)?.status).toBe('available')
  })

  it('nulls nonexistent regionId instead of throwing FK', () => {
    const db = createTestDb()
    const ids = seedPlayer(db)
    expect(() =>
      proposeSide(db, ids, {
        kind: 'side',
        title: 'Ghost region job',
        summary: 'LLM invented a region id.',
        scale: 'minor',
        regionId: 'missing-region-id'
      })
    ).not.toThrow()
    const questRow = db.prepare('SELECT id, region_id FROM quests WHERE kind = ?').get('side') as {
      id: string
      region_id: string | null
    }
    expect(questRow.region_id).toBeNull()
    expect(getCharacterQuest(db, ids.characterId, questRow.id)?.status).toBe('available')
  })
})

describe('persistQuestNarrationSideEffects invalid world fact FK', () => {
  it('nulls nonexistent relatedWorldFactId instead of throwing FK', () => {
    const db = createTestDb()
    const ids = seedPlayer(db)
    expect(() =>
      proposeSide(db, ids, {
        kind: 'side',
        title: 'Ghost fact job',
        summary: 'LLM invented a world fact id.',
        scale: 'minor',
        relatedWorldFactId: 'missing-world-fact-id'
      })
    ).not.toThrow()
    const questRow = db
      .prepare('SELECT id, source_world_fact_id FROM quests WHERE kind = ?')
      .get('side') as { id: string; source_world_fact_id: string | null }
    expect(questRow.source_world_fact_id).toBeNull()
    expect(getCharacterQuest(db, ids.characterId, questRow.id)?.status).toBe('available')
  })
})

describe('persistQuestNarrationSideEffects proposal FK keep', () => {
  it('keeps valid regionId and promotes quest_hook world facts', () => {
    const db = createTestDb()
    const ids = seedPlayer(db)
    const region = createRegion(db, { campaignId: ids.campaignId, name: 'Docks', description: 'Busy pier.' })
    const hook = createWorldFact(db, {
      campaignId: ids.campaignId,
      regionId: region.id,
      factionTag: 'quest_hook',
      content: 'A crate needs escorting to the north gate.'
    })
    proposeSide(db, ids, {
      kind: 'side',
      title: 'Escort the crate',
      summary: 'Take it safely north.',
      scale: 'minor',
      regionId: region.id,
      relatedWorldFactId: hook.id
    })
    const promoted = getQuestBySourceWorldFactId(db, hook.id)!
    expect(promoted.regionId).toBe(region.id)
    expect(getQuestById(db, promoted.id)?.sourceWorldFactId).toBe(hook.id)
    expect(getCharacterQuest(db, ids.characterId, promoted.id)?.status).toBe('available')
  })

  it('does not wipe promoted region when proposal regionId is invalid', () => {
    const db = createTestDb()
    const ids = seedPlayer(db)
    const region = createRegion(db, { campaignId: ids.campaignId, name: 'Docks', description: 'Busy pier.' })
    const hook = createWorldFact(db, {
      campaignId: ids.campaignId,
      regionId: region.id,
      factionTag: 'quest_hook',
      content: 'A crate needs escorting to the north gate.'
    })
    proposeSide(db, ids, {
      kind: 'side',
      title: 'Escort the crate',
      summary: 'Take it safely north.',
      scale: 'minor',
      regionId: 'missing-region-id',
      relatedWorldFactId: hook.id
    })
    expect(getQuestBySourceWorldFactId(db, hook.id)?.regionId).toBe(region.id)
  })
})

describe('persistQuestNarrationSideEffects story thread sync', () => {
  it('syncs story thread updates to the main quest without duplicate rows', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Q', premisePrompt: 'Epic hook', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    const thread = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Main',
      state: 'active',
      summary: 'Begin.'
    })
    seedMainQuestForCampaign(db, {
      campaignId: campaign.id,
      storyThreadId: thread.id,
      title: thread.title,
      summary: thread.summary
    })
    seedCharacterQuestMembership(db, campaign.id, player.id, 0)
    const main = getMainQuestByCampaign(db, campaign.id)!
    persistQuestNarrationSideEffects(
      db,
      {
        narrationText: 'Arc ends.',
        storyThreadUpdate: { threadId: thread.id, state: 'completed', summary: 'The realm is saved.' }
      },
      { campaignId: campaign.id, characterId: player.id }
    )
    expect(db.prepare('SELECT COUNT(*) AS c FROM quests WHERE kind = ?').get('main')).toEqual({ c: 1 })
    expect(getCharacterQuest(db, player.id, main.id)?.status).toBe('completed')
  })
})

describe('persistQuestNarrationSideEffects invalid completions', () => {
  it('drops invalid quest completion ids safely', () => {
    const db = createTestDb()
    const ids = seedPlayer(db)
    const result = persistQuestNarrationSideEffects(
      db,
      { narrationText: 'Nothing.', questCompletions: ['missing-id'] },
      ids
    )
    expect(result.completedQuestIds).toHaveLength(0)
  })
})
