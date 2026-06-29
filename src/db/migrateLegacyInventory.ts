import type Database from 'better-sqlite3'
import { upsertCatalogItemByName } from './repositories/items'
import { addItemToCharacter } from './repositories/characterItems'
import { deriveMechanicalProperties } from '../engine/itemTemplate'
import type { EquipSlot, ItemType } from '../shared/items/types'

function inferLegacyItemType(name: string): ItemType {
  const lower = name.toLowerCase()
  if (lower.includes('armor') || lower.includes('mail') || lower.includes('plate')) {
    return 'armor'
  }
  if (lower.includes('potion') || lower.includes('elixir')) {
    return 'potion'
  }
  if (lower.includes('sword') || lower.includes('bow') || lower.includes('axe') || lower.includes('dagger')) {
    return 'weapon'
  }
  return 'misc'
}

function inferLegacyEquipSlot(itemType: ItemType): EquipSlot | null {
  if (itemType === 'weapon') {
    return 'weapon'
  }
  if (itemType === 'armor') {
    return 'armor'
  }
  return null
}

export function migrateLegacyCharacterInventory(db: Database.Database): void {
  const rows = db
    .prepare(`SELECT id, inventory FROM characters WHERE inventory IS NOT NULL AND inventory != '[]'`)
    .all() as Array<{ id: string; inventory: string }>

  for (const row of rows) {
    const entries = JSON.parse(row.inventory) as unknown[]
    for (const entry of entries) {
      if (typeof entry !== 'string' || entry.trim() === '') {
        continue
      }
      const itemType = inferLegacyItemType(entry)
      const catalogItem = upsertCatalogItemByName(db, {
        name: entry,
        itemType,
        description: `Migrated legacy inventory entry: ${entry}`,
        rarity: 'common',
        mechanicalProperties: deriveMechanicalProperties(itemType, 'common'),
        equipSlot: inferLegacyEquipSlot(itemType),
        source: 'migrated'
      })
      addItemToCharacter(db, row.id, catalogItem.id, 1)
    }
    db.prepare(`UPDATE characters SET inventory = '[]' WHERE id = ?`).run(row.id)
  }
}
