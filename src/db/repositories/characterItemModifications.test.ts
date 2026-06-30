import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { runMigrations } from '../migrations'
import { migrations } from '../schema'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { findCatalogItemByName } from './items'
import { addItemToCharacter } from './characterItems'
import { addModification, listModifications, removeModification } from './characterItemModifications'
import { deleteCampaignCascade } from './deleteCampaign'
import { seedStarterItemCatalog } from '../seedStarterItems'

function seedCharacterWithLongsword(db: Database.Database): {
  campaignId: string
  characterItemId: string
} {
  const campaign = createCampaign(db, { name: 'Mod Test', premisePrompt: 'test', deathMode: 'standard' })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    kind: 'player',
    characterClass: 'Fighter',
    level: 1
  })
  seedStarterItemCatalog(db)
  const longsword = findCatalogItemByName(db, 'Longsword')!
  const row = addItemToCharacter(db, character.id, longsword.id)
  return { campaignId: campaign.id, characterItemId: row.id }
}

describe('character item modifications add/list', () => {
  let db: Database.Database

  afterEach(() => {
    db?.close()
  })

  it('adds and lists modifications keyed to character_items.id', () => {
    db = createTestDb()
    runMigrations(db, migrations)
    const { characterItemId } = seedCharacterWithLongsword(db)
    addModification(db, characterItemId, 'addDamageComponent', {
      damageType: 'fire',
      diceCount: 1,
      diceSize: 6
    })
    const mods = listModifications(db, characterItemId)
    expect(mods).toHaveLength(1)
    expect(mods[0]?.kind).toBe('addDamageComponent')
  })
})

describe('character item modifications isolation', () => {
  let db: Database.Database

  afterEach(() => {
    db?.close()
  })

  it('allows two characters with same catalog item to have different modifications', () => {
    db = createTestDb()
    runMigrations(db, migrations)
    const campaign = createCampaign(db, { name: 'Mod Test', premisePrompt: 'test', deathMode: 'standard' })
    const heroA = createCharacter(db, {
      campaignId: campaign.id,
      name: 'A',
      kind: 'player',
      characterClass: 'Fighter',
      level: 1
    })
    const heroB = createCharacter(db, {
      campaignId: campaign.id,
      name: 'B',
      kind: 'player',
      characterClass: 'Fighter',
      level: 1
    })
    seedStarterItemCatalog(db)
    const longsword = findCatalogItemByName(db, 'Longsword')!
    const rowA = addItemToCharacter(db, heroA.id, longsword.id)
    const rowB = addItemToCharacter(db, heroB.id, longsword.id)
    addModification(db, rowA.id, 'addDamageComponent', { damageType: 'fire', diceCount: 1, diceSize: 6 })
    addModification(db, rowB.id, 'addDamageComponent', { damageType: 'cold', diceCount: 1, diceSize: 4 })
    expect(listModifications(db, rowA.id)[0]?.payload).toEqual({ damageType: 'fire', diceCount: 1, diceSize: 6 })
    expect(listModifications(db, rowB.id)[0]?.payload).toEqual({ damageType: 'cold', diceCount: 1, diceSize: 4 })
  })
})

describe('character item modifications cascade', () => {
  let db: Database.Database

  afterEach(() => {
    db?.close()
  })

  it('cascades delete with character_items and deleteCampaign', () => {
    db = createTestDb()
    runMigrations(db, migrations)
    const { campaignId, characterItemId } = seedCharacterWithLongsword(db)
    const mod = addModification(db, characterItemId, 'addDamageComponent', {
      damageType: 'fire',
      diceCount: 1,
      diceSize: 6
    })
    removeModification(db, mod.id)
    expect(listModifications(db, characterItemId)).toHaveLength(0)
    addModification(db, characterItemId, 'addDamageComponent', {
      damageType: 'fire',
      diceCount: 1,
      diceSize: 6
    })
    deleteCampaignCascade(db, campaignId)
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM character_items').get() as { count: number }
    ).toEqual({ count: 0 })
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM character_item_modifications').get() as { count: number }
    ).toEqual({ count: 0 })
  })
})
