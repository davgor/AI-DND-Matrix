import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter, getCharacterById } from './repositories/characters'

describe('background_custom_label migration (126.5)', () => {
  it('defaults custom label to null and round-trips values', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Custom BG',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'rogue',
      kind: 'player',
      backgroundKey: 'custom',
      backgroundCustomLabel: 'River Smuggler',
      backgroundStory: 'I ran the docks.'
    })
    expect(player.backgroundCustomLabel).toBe('River Smuggler')
    expect(getCharacterById(db, player.id)?.backgroundCustomLabel).toBe('River Smuggler')

    const legacy = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Legacy',
      characterClass: 'fighter',
      kind: 'player',
      backgroundKey: 'soldier'
    })
    expect(legacy.backgroundCustomLabel).toBeNull()
  })
})
