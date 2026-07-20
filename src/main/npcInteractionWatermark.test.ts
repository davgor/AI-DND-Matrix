import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { recordNpcPlayerInteraction } from './npcInteractionWatermark'

describe('recordNpcPlayerInteraction', () => {
  it('bumps lastPlayerInteractionAt on the NPC row', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Watermark',
      premisePrompt: 'test',
      deathMode: 'legendary'
    })
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Town',
      description: 'Quiet.'
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'warm'
    })
    createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })

    recordNpcPlayerInteraction(db, npc.id, '2026-07-20T15:00:00.000Z')

    expect(getNpcById(db, npc.id)?.lastPlayerInteractionAt).toBe('2026-07-20T15:00:00.000Z')
  })
})
