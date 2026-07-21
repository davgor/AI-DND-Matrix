import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter, getCharacterById } from './repositories/characters'
import { GUIDED_CREATION_PHASES } from '../shared/guidedCreation/types'

describe('companions guided phase migration (129.2)', () => {
  it('includes companions in GUIDED_CREATION_PHASES between equipment and identity', () => {
    const equipmentIndex = GUIDED_CREATION_PHASES.indexOf('equipment')
    const companionsIndex = GUIDED_CREATION_PHASES.indexOf('companions')
    const identityIndex = GUIDED_CREATION_PHASES.indexOf('identity')
    expect(companionsIndex).toBe(equipmentIndex + 1)
    expect(identityIndex).toBe(companionsIndex + 1)
  })

  it('persists companions phase on a player character', () => {
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
      kind: 'player',
      guidedCreationPhase: 'companions'
    })
    expect(getCharacterById(db, player.id)?.guidedCreationPhase).toBe('companions')
  })
})
