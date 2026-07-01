import type Database from 'better-sqlite3'
import type { EquipSlot } from '../shared/items/types'

export interface LegacyItemRow {
  id: string
  name: string
  item_type: string
  description: string
  rarity: string
  mechanical_properties: string
  equip_slot: string | null
  source: string
}

export function readLegacyItems(db: Database.Database): LegacyItemRow[] {
  return db.prepare('SELECT * FROM items').all() as LegacyItemRow[]
}

export function readLegacyCharacterItems(db: Database.Database): Array<{
  id: string
  character_id: string
  item_id: string
  quantity: number
  equipped_slot: string | null
  item_name: string
}> {
  return db
    .prepare('SELECT ci.*, i.name AS item_name FROM character_items ci JOIN items i ON i.id = ci.item_id')
    .all() as Array<{
    id: string
    character_id: string
    item_id: string
    quantity: number
    equipped_slot: string | null
    item_name: string
  }>
}

export function insertMigratedItems(
  db: Database.Database,
  items: LegacyItemRow[],
  patchWeaponHandedness: (propsJson: string, itemName: string) => string,
  migrateEquipSlotValue: (legacySlot: string | null, itemName: string) => EquipSlot | null
): void {
  const insertItem = db.prepare(
    `INSERT INTO items (id, name, item_type, description, rarity, mechanical_properties, equip_slot, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const row of items) {
    insertItem.run(
      row.id,
      row.name,
      row.item_type,
      row.description,
      row.rarity,
      patchWeaponHandedness(row.mechanical_properties, row.name),
      migrateEquipSlotValue(row.equip_slot, row.name),
      row.source
    )
  }
}

export function insertMigratedCharacterItems(
  db: Database.Database,
  characterItems: ReturnType<typeof readLegacyCharacterItems>,
  migrateEquipSlotValue: (legacySlot: string | null, itemName: string) => EquipSlot | null
): void {
  const insertCharacterItem = db.prepare(
    `INSERT INTO character_items (id, character_id, item_id, quantity, equipped_slot)
     VALUES (?, ?, ?, ?, ?)`
  )
  for (const row of characterItems) {
    insertCharacterItem.run(
      row.id,
      row.character_id,
      row.item_id,
      row.quantity,
      row.equipped_slot ? migrateEquipSlotValue(row.equipped_slot, row.item_name) : null
    )
  }
}
