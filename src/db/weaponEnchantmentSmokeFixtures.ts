import type Database from 'better-sqlite3'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createRegion } from './repositories/regions'
import { createNpc, setNpcCombatStats } from './repositories/npcs'
import { findCatalogItemByName } from './repositories/items'
import { addItemToCharacter, equipCharacterItem } from './repositories/characterItems'
import { seedStarterItemCatalog } from './seedStarterItems'

export function seedWeaponEnchantmentSmoke(db: Database.Database) {
  const campaign = createCampaign(db, { name: 'Smoke', premisePrompt: 'x', deathMode: 'standard' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Forge', description: 'Hot.' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Smith',
    kind: 'player',
    characterClass: 'Fighter',
    level: 3,
    stats: {
      currentRegionId: region.id,
      abilityScores: { body: 16, agility: 14, mind: 10, presence: 10 },
      weaponProficient: true
    }
  })
  seedStarterItemCatalog(db)
  const longsword = findCatalogItemByName(db, 'Longsword')!
  const row = addItemToCharacter(db, player.id, longsword.id)
  equipCharacterItem(db, player.id, row.id, 'weapon')
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Dummy',
    role: 'target',
    disposition: 'hostile'
  })
  setNpcCombatStats(db, npc.id, { hp: 30, maxHp: 30, ac: 10 })
  return {
    campaignId: campaign.id,
    playerId: player.id,
    rowId: row.id,
    longswordId: longsword.id,
    npcId: npc.id
  }
}
