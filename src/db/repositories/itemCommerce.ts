import type Database from 'better-sqlite3'
import { computeTotalAC } from '../../engine/armorClass'
import { priceForItem } from '../../engine/itemPricing'
import type { NarrationResult } from '../../agents/dm'
import { adjustCharacterCurrency } from './characters'
import { purchaseItemForCharacter } from './itemFlows'
import { getCatalogItemById } from './items'
import {
  getEquippedAccessoryBonuses,
  getEquippedArmorTier,
  getEquippedShieldBonus
} from './characterItems'

export interface CommerceSideEffect {
  currencyGranted?: number
  currencyBalance?: number
  purchases: Array<
    | { catalogItemId: string; ok: true; price: number; newBalance: number }
    | { catalogItemId: string; ok: false; reason: 'item_not_found' | 'insufficient_funds' }
  >
}

export function computeCharacterTotalAc(
  db: Database.Database,
  characterId: string,
  agilityScore: number
): number {
  const accessories = getEquippedAccessoryBonuses(db, characterId)
  return computeTotalAC({
    agilityScore,
    armorTier: getEquippedArmorTier(db, characterId),
    shieldBonus: getEquippedShieldBonus(db, characterId),
    accessoryAcBonus: accessories.acBonus
  })
}

export function persistNarrationCommerce(
  db: Database.Database,
  characterId: string,
  result: Pick<NarrationResult, 'currencyGrants' | 'itemPurchases'>
): CommerceSideEffect {
  const purchases: CommerceSideEffect['purchases'] = []
  let currencyGranted: number | undefined
  let currencyBalance: number | undefined

  if (result.currencyGrants?.amount && result.currencyGrants.amount > 0) {
    const credit = adjustCharacterCurrency(db, characterId, result.currencyGrants.amount)
    if (credit.success) {
      currencyGranted = result.currencyGrants.amount
      currencyBalance = credit.newBalance
    }
  }

  for (const purchase of result.itemPurchases ?? []) {
    const item = getCatalogItemById(db, purchase.catalogItemId)
    if (!item) {
      purchases.push({ catalogItemId: purchase.catalogItemId, ok: false, reason: 'item_not_found' })
      continue
    }
    const price = priceForItem(item.itemType, item.rarity)
    const outcome = purchaseItemForCharacter(db, characterId, purchase.catalogItemId, price)
    if (!outcome.ok) {
      purchases.push({ catalogItemId: purchase.catalogItemId, ok: false, reason: outcome.reason })
      continue
    }
    purchases.push({
      catalogItemId: purchase.catalogItemId,
      ok: true,
      price,
      newBalance: outcome.newBalance
    })
    currencyBalance = outcome.newBalance
  }

  return { currencyGranted, currencyBalance, purchases }
}
