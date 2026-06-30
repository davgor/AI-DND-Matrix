import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { createCharacterJournalEntry } from '../db/repositories/characterJournalEntries'
import { buildLevelSpanContext } from './levelSpanContext'

describe('buildLevelSpanContext arcane fixture', () => {
  it('produces high arcane tag counts for library fixture', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 't', deathMode: 'standard' })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Scholar',
      characterClass: 'fighter',
      kind: 'player',
      level: 1,
      stats: { lastLevelUpXp: 0 }
    })
    createCharacterJournalEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      content: 'Spent the week studying spells at the library.',
      inGameDate: 3
    })
    appendEvent(db, {
      campaignId: campaign.id,
      type: 'player_action',
      payload: { characterId: hero.id, activityTag: 'arcane', playerInput: 'Study arcane theory' }
    })
    const ctx = buildLevelSpanContext({
      db,
      campaignId: campaign.id,
      characterId: hero.id,
      archetype: 'fighter',
      newLevel: 2,
      spanStartXp: 0
    })
    expect(ctx.activityTags.arcane).toBeGreaterThanOrEqual(2)
  })
})
