import type { ItemRarity, ItemType } from '../shared/items/types'

const BASE_PRICE: Record<ItemType, number> = {
  weapon: 15,
  armor: 25,
  potion: 8,
  magicItem: 40,
  misc: 5
}

const RARITY_MULTIPLIER: Record<ItemRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 8
}

export const MAX_ITEM_PRICE = 500

export function priceForItem(itemType: ItemType, rarity: ItemRarity): number {
  const raw = BASE_PRICE[itemType] * RARITY_MULTIPLIER[rarity]
  return Math.min(Math.max(raw, 1), MAX_ITEM_PRICE)
}
