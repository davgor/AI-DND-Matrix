import Database from 'better-sqlite3'
import { runMigrations } from './migrations'
import { migrations } from './schema'
import { migrateEquipSlotsV24 } from './migrateEquipSlotsV24'

export function createLegacyEquipDatabase(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(db, migrations.filter((migration) => migration.version < 13))
  db.exec(`
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      item_type TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      rarity TEXT NOT NULL,
      mechanical_properties TEXT NOT NULL DEFAULT '{}',
      equip_slot TEXT CHECK (equip_slot IN ('weapon', 'armor', 'trinket') OR equip_slot IS NULL),
      source TEXT NOT NULL DEFAULT 'seed'
    );
    CREATE TABLE character_items (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      equipped_slot TEXT CHECK (equipped_slot IN ('weapon', 'armor', 'trinket') OR equipped_slot IS NULL)
    );
  `)
  runMigrations(db, migrations.filter((migration) => migration.version > 13 && migration.version < 24))
  runMigrations(db, migrations.filter((migration) => migration.version === 26))
  runMigrations(db, migrations.filter((migration) => migration.version === 29))
  runMigrations(db, migrations.filter((migration) => migration.version === 30))
  return db
}

export function seedLegacyEquippedItems(
  db: Database.Database,
  input: { characterId: string; swordId: string; ringId: string; swordRowId: string; ringRowId: string }
): void {
  db.prepare(
    `INSERT INTO items (id, name, item_type, description, rarity, mechanical_properties, equip_slot, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.swordId,
    'Legacy Blade',
    'weapon',
    'Old weapon',
    'common',
    JSON.stringify({
      kind: 'weapon',
      damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 },
      damageType: 'physical'
    }),
    'weapon',
    'seed'
  )
  db.prepare(
    `INSERT INTO items (id, name, item_type, description, rarity, mechanical_properties, equip_slot, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.ringId,
    'Old Trinket Ring',
    'magicItem',
    'Ring',
    'common',
    JSON.stringify({ kind: 'magicItem', acBonus: 1, attackBonus: 0 }),
    'trinket',
    'seed'
  )
  db.prepare(
    'INSERT INTO character_items (id, character_id, item_id, quantity, equipped_slot) VALUES (?, ?, ?, ?, ?)'
  ).run(input.swordRowId, input.characterId, input.swordId, 1, 'weapon')
  db.prepare(
    'INSERT INTO character_items (id, character_id, item_id, quantity, equipped_slot) VALUES (?, ?, ?, ?, ?)'
  ).run(input.ringRowId, input.characterId, input.ringId, 1, 'trinket')
  migrateEquipSlotsV24(db)
}
