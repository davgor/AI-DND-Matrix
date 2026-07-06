import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createNpc, getNpcById } from './repositories/npcs'
import { createRegion } from './repositories/regions'

describe('npc gender/class migration (052.2)', () => {
  it('round-trips gender_key and class_key with null defaults', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'R' })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'clerk',
      disposition: 'friendly',
      genderKey: 'woman',
      classKey: 'commoner'
    })
    expect(getNpcById(db, npc.id)?.genderKey).toBe('woman')
    expect(getNpcById(db, npc.id)?.classKey).toBe('commoner')

    const legacy = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Old',
      role: 'hermit',
      disposition: 'quiet'
    })
    expect(getNpcById(db, legacy.id)?.genderKey).toBeNull()
    expect(getNpcById(db, legacy.id)?.classKey).toBeNull()
  })
})
