import { createTestDb } from '../db/testUtils'
import { runMigrations } from '../db/migrations'
import { migrations } from '../db/schema'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { findCatalogItemByName } from '../db/repositories/items'
import { addItemToCharacter } from '../db/repositories/characterItems'
import { seedStarterItemCatalog } from '../db/seedStarterItems'

export function seedPipelineCampaign() {
  const db = createTestDb()
  runMigrations(db, migrations)
  const campaign = createCampaign(db, { name: 'Pipe', premisePrompt: 'x', deathMode: 'standard' })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    kind: 'player',
    characterClass: 'Fighter',
    level: 1
  })
  seedStarterItemCatalog(db)
  const row = addItemToCharacter(db, character.id, findCatalogItemByName(db, 'Longsword')!.id)
  return { db, campaign, character, row }
}
