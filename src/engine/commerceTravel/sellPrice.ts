import { priceForItem } from '../itemPricing'
import type { ItemRarity, ItemType } from '../../shared/items/types'

/** Engine sell credit: half buy price, at least 1 gold. */
export function sellPriceForItem(itemType: ItemType, rarity: ItemRarity): number {
  return Math.max(1, Math.floor(priceForItem(itemType, rarity) / 2))
}
