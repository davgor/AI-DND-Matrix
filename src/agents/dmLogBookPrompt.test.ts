import { describe, expect, it } from 'vitest'
import { assembleNarrationContext, narrate } from './dm'
import { createScriptedProvider } from './providers/mockHarness'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createLogEntry } from '../db/repositories/logEntries'
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

describe('narrate log book prompt grounding', () => {
  it('includes log book consistency instructions in the narration prompt', async () => {
    const db = createTestDb()
    const { campaign, region, player } = seedCampaignWithPlayer(db)
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: player.id,
      category: 'place',
      title: 'Oakhollow',
      content: 'A logging village.',
      learnedInGameDate: 1
    })
    const provider = createScriptedProvider(['{"narrationText":"You look around."}'])
    const context = await assembleNarrationContext({ db, campaignId: campaign.id, regionId: region.id, characterId: player.id, playerInput: 'test action' })
    await narrate(provider, { success: true, total: 12, dc: 10 }, context)
    expect(provider.calls[0]?.prompt).toContain('do not contradict')
    expect(provider.calls[0]?.prompt).toContain('Oakhollow')
  })
})
