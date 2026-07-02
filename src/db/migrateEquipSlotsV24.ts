import type Database from 'better-sqlite3'
import {
  inferWeaponHandedness,
  migrateEquipSlotValue,
  NEW_EQUIP_SLOT_CHECK
} from './migrateEquipSlots'
import { insertMigratedCharacterItems, insertMigratedItems, readLegacyCharacterItems, readLegacyItems } from './migrateEquipSlotsLegacyIO'

function hasLegacyEquipSlotConstraint(db: Database.Database): boolean {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'items'")
    .get() as { sql: string } | undefined
  return row?.sql.includes("equip_slot IN ('weapon'") ?? false
}

function patchWeaponHandedness(propsJson: string, itemName: string): string {
  const props = JSON.parse(propsJson) as Record<string, unknown>
  if (props['kind'] !== 'weapon') {
    return propsJson
  }
  if (props['handedness'] === 'oneHand' || props['handedness'] === 'twoHand') {
    return propsJson
  }
  return JSON.stringify({ ...props, handedness: inferWeaponHandedness(itemName) })
}

function createExpandedItemTables(db: Database.Database): void {
  db.exec(`
    ALTER TABLE items RENAME TO items_legacy_v24;
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      item_type TEXT NOT NULL CHECK (item_type IN ('weapon', 'armor', 'potion', 'magicItem', 'misc')),
      description TEXT NOT NULL DEFAULT '',
      rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic')),
      mechanical_properties TEXT NOT NULL DEFAULT '{}',
      equip_slot TEXT CHECK (equip_slot IN ${NEW_EQUIP_SLOT_CHECK} OR equip_slot IS NULL),
      source TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'ai_proposed', 'migrated'))
    );
    ALTER TABLE character_items RENAME TO character_items_legacy_v24;
    CREATE TABLE character_items (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id),
      item_id TEXT NOT NULL REFERENCES items(id),
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      equipped_slot TEXT CHECK (equipped_slot IN ${NEW_EQUIP_SLOT_CHECK} OR equipped_slot IS NULL),
      UNIQUE (character_id, item_id)
    );
  `)
}

function migrateLegacyTables(db: Database.Database): void {
  const items = readLegacyItems(db)
  const characterItems = readLegacyCharacterItems(db)
  db.pragma('foreign_keys = OFF')
  createExpandedItemTables(db)
  insertMigratedItems(db, items, patchWeaponHandedness, migrateEquipSlotValue)
  insertMigratedCharacterItems(db, characterItems, migrateEquipSlotValue)
  db.exec(`
    DROP TABLE items_legacy_v24;
    DROP TABLE character_items_legacy_v24;
  `)
  db.pragma('foreign_keys = ON')
}

function migrateEquipSlotRows(db: Database.Database): void {
  const items = db.prepare('SELECT id, name, equip_slot, mechanical_properties FROM items').all() as Array<{
    id: string
    name: string
    equip_slot: string | null
    mechanical_properties: string
  }>
  for (const row of items) {
    const nextSlot = migrateEquipSlotValue(row.equip_slot, row.name)
    const nextProps = patchWeaponHandedness(row.mechanical_properties, row.name)
    db.prepare('UPDATE items SET equip_slot = ?, mechanical_properties = ? WHERE id = ?').run(
      nextSlot,
      nextProps,
      row.id
    )
  }

  const equipped = db
    .prepare(
      `SELECT ci.id, i.name, ci.equipped_slot
       FROM character_items ci
       JOIN items i ON i.id = ci.item_id
       WHERE ci.equipped_slot IS NOT NULL`
    )
    .all() as Array<{ id: string; name: string; equipped_slot: string }>

  for (const row of equipped) {
    const nextSlot = migrateEquipSlotValue(row.equipped_slot, row.name)
    db.prepare('UPDATE character_items SET equipped_slot = ? WHERE id = ?').run(nextSlot, row.id)
  }
}

export function migrateEquipSlotsV24(db: Database.Database): void {
  if (hasLegacyEquipSlotConstraint(db)) {
    migrateLegacyTables(db)
    return
  }
  migrateEquipSlotRows(db)
}
