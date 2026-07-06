import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDb } from './testUtils'
import { migrations } from './schema'
import { runMigrations } from './migrations'
import { createCampaign } from './repositories/campaigns'
import { createCharacter, getCharacterById } from './repositories/characters'
import { createRegion } from './repositories/regions'
import { createNpc, getNpcById } from './repositories/npcs'
import { migrateHpBackfill } from './migrateHpBackfill'

function createPreHpMigrationDb(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(
    db,
    migrations.filter((migration) => migration.version <= 22)
  )
  runMigrations(db, migrations.filter((migration) => migration.version === 26))
  runMigrations(db, migrations.filter((migration) => migration.version === 29))
  runMigrations(db, migrations.filter((migration) => migration.version === 30))
  runMigrations(db, migrations.filter((migration) => migration.version === 31))
  runMigrations(db, migrations.filter((migration) => migration.version === 32))
  runMigrations(db, migrations.filter((migration) => migration.version === 33))
  runMigrations(db, migrations.filter((migration) => migration.version === 34))
  return db
}

describe('migrateHpBackfill', () => {
  it('backfills characters with hp 0 to rolled maxHp', () => {
    const db = createPreHpMigrationDb()
    const campaign = createCampaign(db, { name: 'Old', premisePrompt: 'old', deathMode: 'legendary' })
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Broken',
      characterClass: 'fighter',
      kind: 'ai_party_member',
      hp: 0,
      stats: { personality: 'quiet' }
    })

    migrateHpBackfill(db)

    const updated = getCharacterById(db, character.id)!
    const stats = updated.stats as { maxHp: number; hitDieRolls: number[] }
    expect(updated.hp).toBeGreaterThan(0)
    expect(stats.maxHp).toBe(updated.hp)
    expect(stats.hitDieRolls.length).toBeGreaterThan(0)
  })

  it('is idempotent on second run', () => {
    const db = createPreHpMigrationDb()
    const campaign = createCampaign(db, { name: 'Old', premisePrompt: 'old', deathMode: 'legendary' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'R' })
    createCharacter(db, {
      campaignId: campaign.id,
      name: 'Broken',
      characterClass: 'fighter',
      kind: 'player',
      hp: 0,
      stats: {}
    })
    const farmer = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Farmer',
      role: 'villager',
      disposition: 'neutral',
      skipCombatHydration: true
    })
    db.prepare(`UPDATE npcs SET hp = 6, max_hp = 6 WHERE id = ?`).run(farmer.id)

    migrateHpBackfill(db)
    const farmerAfterFirst = getNpcById(db, farmer.id)
    migrateHpBackfill(db)
    const farmerAfterSecond = getNpcById(db, farmer.id)
    expect(farmerAfterFirst?.maxHp).toBe(10)
    expect(farmerAfterSecond?.maxHp).toBe(10)
    expect(farmerAfterSecond?.hp).toBe(10)
  })
})

describe('schema migration v23', () => {
  it('runs hp backfill when opening a fresh test database', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Migrated', premisePrompt: 'm', deathMode: 'legendary' })
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Legacy',
      characterClass: 'mage',
      kind: 'player',
      hp: 0,
      stats: {}
    })
    db.prepare(`UPDATE characters SET hp = 0, stats = '{}' WHERE id = ?`).run(character.id)
    migrateHpBackfill(db)
    const updated = getCharacterById(db, character.id)!
    expect(updated.hp).toBeGreaterThan(0)
  })
})
