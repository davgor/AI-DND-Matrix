import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCharacter } from './repositories/characters'
import { createCampaign } from './repositories/campaigns'
import { readGuidedCreationFields } from './repositories/guidedCreation'

describe('guided creation equipment phase migration', () => {
  it('allows equipment phase on new player characters', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('race')
  })
})
