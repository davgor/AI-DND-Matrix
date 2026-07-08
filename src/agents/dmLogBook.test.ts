import { describe, expect, it } from 'vitest'
import { assembleNarrationContext, persistNarrationSideEffects } from './dm'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createLogEntry, listLogEntriesByCharacter } from '../db/repositories/logEntries'
import { createRegion } from '../db/repositories/regions'

function seedCampaignWithPlayer(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'The Sunken Crown',
    premisePrompt: 'A flooded kingdom hides an ancient throne.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A quiet logging village.'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player'
  })
  return { campaign, region, player }
}

describe('assembleNarrationContext log book entries', () => {
  it('includes only the acting character windowed log entries', () => {
    const db = createTestDb()
    const { campaign, region, player } = seedCampaignWithPlayer(db)
    const other = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Other',
      characterClass: 'rogue',
      kind: 'ai_party_member'
    })
    const heroEntry = createLogEntry(db, {
      campaignId: campaign.id,
      characterId: player.id,
      category: 'person',
      title: 'Mira',
      content: 'Runs the store.',
      relatedEntityId: 'npc-mira',
      learnedInGameDate: 2
    })
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: other.id,
      category: 'beast',
      title: 'Wolf',
      content: 'Not your memory.',
      learnedInGameDate: 2
    })

    const context = assembleNarrationContext({ db, campaignId: campaign.id, regionId: region.id, characterId: player.id, playerInput: 'test action' })
    // Slim shape (040.4): id preserved for amendment/deletion echo; campaignId/characterId/dates dropped.
    expect(context.logBookEntries).toEqual([
      {
        id: heroEntry.id,
        category: 'person',
        title: 'Mira',
        content: 'Runs the store.',
        relatedEntityId: 'npc-mira'
      }
    ])
  })

  it('returns an empty log book section for a character with no entries', () => {
    const db = createTestDb()
    const { campaign, region, player } = seedCampaignWithPlayer(db)
    const context = assembleNarrationContext({ db, campaignId: campaign.id, regionId: region.id, characterId: player.id, playerInput: 'test action' })
    expect(context.logBookEntries).toEqual([])
  })
})

describe('persistNarrationSideEffects log book proposals', () => {
  it('persists valid log book proposals for the acting character', () => {
    const db = createTestDb()
    const { campaign, region, player } = seedCampaignWithPlayer(db)
    persistNarrationSideEffects(
      db,
      {
        narrationText: 'You meet someone new.',
        logBookEntries: [
          { category: 'person', title: 'Mira', content: 'A friendly woodcutter.' },
          { category: 'invalid', title: 'Skip', content: 'Dropped.' }
        ]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: player.id }
    )
    expect(listLogEntriesByCharacter(db, player.id)).toHaveLength(1)
  })
})
