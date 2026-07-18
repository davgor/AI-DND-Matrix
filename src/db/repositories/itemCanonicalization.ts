import type Database from 'better-sqlite3'
import { clampItemRarity, deriveMechanicalProperties } from '../../engine/itemTemplate'
import type { CatalogItem, EquipSlot, ItemType } from '../../shared/items/types'
import { getCatalogItemById, upsertCatalogItemByName } from './items'

export interface ProposedCatalogItemInput {
  name: string
  description: string
  itemType: ItemType
  rarityTier: string
}

function defaultEquipSlot(itemType: ItemType): EquipSlot | null {
  if (itemType === 'weapon') {
    return 'mainHand'
  }
  if (itemType === 'armor') {
    return 'armor'
  }
  if (itemType === 'magicItem') {
    return 'ring1'
  }
  return null
}

export function canonicalizeProposedItem(
  db: Database.Database,
  input: ProposedCatalogItemInput
): CatalogItem {
  const rarity = clampItemRarity(input.rarityTier)
  return upsertCatalogItemByName(db, {
    name: input.name,
    itemType: input.itemType,
    description: input.description,
    rarity,
    mechanicalProperties: deriveMechanicalProperties(input.itemType, rarity),
    equipSlot: defaultEquipSlot(input.itemType),
    source: 'ai_proposed'
  })
}

export function resolveCatalogItemReference(
  db: Database.Database,
  catalogItemId: string
): CatalogItem | undefined {
  return getCatalogItemById(db, catalogItemId)
}
