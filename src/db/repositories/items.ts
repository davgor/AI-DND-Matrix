import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  CatalogItem,
  EquipSlot,
  ItemRarity,
  ItemSource,
  ItemType,
  MechanicalProperties
} from '../../shared/items/types'

export interface CreateCatalogItemInput {
  name: string
  itemType: ItemType
  description: string
  rarity: ItemRarity
  mechanicalProperties: MechanicalProperties
  equipSlot: EquipSlot | null
  source: ItemSource
}

interface ItemRow {
  id: string
  name: string
  item_type: ItemType
  description: string
  rarity: ItemRarity
  mechanical_properties: string
  equip_slot: EquipSlot | null
  source: ItemSource
}

function rowToCatalogItem(row: ItemRow): CatalogItem {
  return {
    id: row.id,
    name: row.name,
    itemType: row.item_type,
    description: row.description,
    rarity: row.rarity,
    mechanicalProperties: JSON.parse(row.mechanical_properties) as MechanicalProperties,
    equipSlot: row.equip_slot,
    source: row.source
  }
}

export function createCatalogItem(db: Database.Database, input: CreateCatalogItemInput): CatalogItem {
  const id = randomUUID()
  db.prepare(
    `INSERT INTO items
      (id, name, item_type, description, rarity, mechanical_properties, equip_slot, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.itemType,
    input.description,
    input.rarity,
    JSON.stringify(input.mechanicalProperties),
    input.equipSlot,
    input.source
  )
  return {
    id,
    name: input.name,
    itemType: input.itemType,
    description: input.description,
    rarity: input.rarity,
    mechanicalProperties: input.mechanicalProperties,
    equipSlot: input.equipSlot,
    source: input.source
  }
}

export function getCatalogItemById(db: Database.Database, id: string): CatalogItem | undefined {
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as ItemRow | undefined
  return row ? rowToCatalogItem(row) : undefined
}

export function findCatalogItemByName(db: Database.Database, name: string): CatalogItem | undefined {
  const row = db
    .prepare('SELECT * FROM items WHERE lower(name) = lower(?)')
    .get(name) as ItemRow | undefined
  return row ? rowToCatalogItem(row) : undefined
}

export function listCatalogItems(db: Database.Database): CatalogItem[] {
  const rows = db.prepare('SELECT * FROM items ORDER BY name').all() as ItemRow[]
  return rows.map(rowToCatalogItem)
}

export function upsertCatalogItemByName(
  db: Database.Database,
  input: CreateCatalogItemInput
): CatalogItem {
  const existing = findCatalogItemByName(db, input.name)
  if (existing) {
    return existing
  }
  return createCatalogItem(db, input)
}
