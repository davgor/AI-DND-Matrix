import type { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'

export function seedEquipCharacter(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Items',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  return createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
}
