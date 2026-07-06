import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createNpc, getNpcById } from './repositories/npcs'
import { createRegion } from './repositories/regions'

describe('npc background migration background_key column (051.1)', () => {
  it('round-trips background_key on npcs and defaults null for pre-existing rows', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'R' })
    createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      backgroundKey: 'soldier'
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Veteran',
      role: 'innkeeper',
      disposition: 'gruff',
      backgroundKey: 'soldier'
    })
    expect(getNpcById(db, npc.id)?.backgroundKey).toBe('soldier')

    const legacy = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Old Timer',
      role: 'hermit',
      disposition: 'quiet'
    })
    expect(getNpcById(db, legacy.id)?.backgroundKey).toBeNull()
  })
})
