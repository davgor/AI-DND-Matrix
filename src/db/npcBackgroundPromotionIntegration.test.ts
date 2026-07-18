import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter, listCharactersByCampaign } from './repositories/characters'
import { listNpcsByRegion } from './repositories/npcs'
import { createRegion } from './repositories/regions'
import { createRegionHistoryEntry } from './repositories/regionHistory'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { RACE_LORE_RESPONSE } from '../test/fixtures/campaignGenerationFixtures'
import { confirmNpcPromotion } from '../main/promotionIpc'
import { generateNpcForCampaign } from '../main/campaignEditIpc'

describe('npc background promotion integration (051.7)', () => {
  it('carries backgroundKey forward after flagged two-phase generation', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Flagged NPC',
      premisePrompt: 'War veterans haunt the taverns.',
      deathMode: 'legendary'
    })
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Harbor',
      description: 'A salt-stained port.'
    })
    createRegionHistoryEntry(db, { regionId: region.id, inGameDate: 0, content: 'Dock fire.' })
    createCharacter(db, { campaignId: campaign.id, name: 'Hero', characterClass: 'fighter', kind: 'player' })

    const provider = createScriptedProvider([
      JSON.stringify({
        canSpeak: true,
        temperament: 'cautious',
        race: 'human',
        gender: 'man',
        alignment: 'lawful_neutral',
        class: 'commoner',
        background: 'soldier'
      }),
      RACE_LORE_RESPONSE,
      JSON.stringify({
        name: 'Garrick Holt',
        role: 'tavern keeper',
        backstory: 'Garrick still polishes his old campaign medals behind the bar.',
        disposition: 'Gruff but fair to fellow veterans.'
      }),
      '{"upgrade":false}'
    ])
    await generateNpcForCampaign(db, provider, {
      campaignId: campaign.id,
      regionId: region.id,
      seedPrompt: 'A grizzled war veteran running the tavern'
    })

    const npc = listNpcsByRegion(db, region.id).find((row) => row.name === 'Garrick Holt')
    expect(npc?.backgroundKey).toBe('soldier')
    confirmNpcPromotion(db, { campaignId: campaign.id, npcId: npc!.id })
    const promoted = listCharactersByCampaign(db, campaign.id).find((c) => c.sourceNpcId === npc!.id)
    expect(promoted?.backgroundKey).toBe('soldier')
  })
})
