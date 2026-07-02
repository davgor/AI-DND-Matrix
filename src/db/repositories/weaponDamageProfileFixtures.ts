import { createTestDb } from '../testUtils'
import { runMigrations } from '../migrations'
import { migrations } from '../schema'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { findCatalogItemByName } from './items'
import { addItemToCharacter, equipCharacterItem } from './characterItems'
import { seedStarterItemCatalog } from '../seedStarterItems'

export function seedLongswordHero() {
  const db = createTestDb()
  runMigrations(db, migrations)
  const campaign = createCampaign(db, { name: 'W', premisePrompt: 'x', deathMode: 'standard' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    kind: 'player',
    characterClass: 'Fighter',
    level: 1
  })
  seedStarterItemCatalog(db)
  const row = addItemToCharacter(db, player.id, findCatalogItemByName(db, 'Longsword')!.id)
  equipCharacterItem(db, player.id, row.id, 'mainHand')
  return { db, campaign, player, row }
}
