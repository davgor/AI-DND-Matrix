import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { editNpcDisposition, editRegionDescription, setCampaignDeathMode } from './campaignEditIpc'

function seedCampaignWithRegionAndNpc() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A quiet logging village.'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'shopkeeper',
    disposition: 'friendly'
  })
  return { db, campaign, region, npc }
}

describe('editRegionDescription', () => {
  it('persists an edited region description and returns the refreshed detail', () => {
    const { db, campaign, region } = seedCampaignWithRegionAndNpc()

    const detail = editRegionDescription(db, {
      campaignId: campaign.id,
      regionId: region.id,
      description: 'Now a bustling trade hub.'
    })

    expect(detail.regions.find((r) => r.id === region.id)?.description).toBe(
      'Now a bustling trade hub.'
    )
  })
})

describe('editNpcDisposition', () => {
  it('persists an edited NPC disposition and returns the refreshed detail', () => {
    const { db, campaign, npc } = seedCampaignWithRegionAndNpc()

    const detail = editNpcDisposition(db, {
      campaignId: campaign.id,
      npcId: npc.id,
      disposition: 'wary, after the bandit raid'
    })

    expect(detail.npcs.find((n) => n.id === npc.id)?.disposition).toBe(
      'wary, after the bandit raid'
    )
  })
})

describe('setCampaignDeathMode', () => {
  it('switches the campaign to respawn mode with rules persisted', () => {
    const { db, campaign } = seedCampaignWithRegionAndNpc()

    const detail = setCampaignDeathMode(db, {
      campaignId: campaign.id,
      deathMode: 'respawn',
      respawnRules: { location: 'Last Shrine', cost: 50, limit: 3 }
    })

    expect(detail.campaign?.deathMode).toBe('respawn')
    expect(detail.campaign?.respawnRules).toEqual({ location: 'Last Shrine', cost: 50, limit: 3 })
  })
})
