import type Database from 'better-sqlite3'
import { resolveTravel } from '../../engine/travel'
import { sellPriceForItem } from '../../engine/commerceTravel/sellPrice'
import { priceForItem } from '../../engine/itemPricing'
import {
  commerceFailMessage,
  travelFailMessage
} from '../../shared/commerceTravel/feedback'
import type {
  ClassifiedCommerceIntent,
  ClassifiedTravelIntent,
  CommerceResolveResult,
  TravelResolveResult
} from '../../shared/commerceTravel/types'
import type { ItemRarity, ItemType } from '../../shared/items/types'
import { advanceInGameDate, getCampaignById } from './campaigns'
import { adjustCharacterCurrency, getCharacterById, updateCharacter } from './characters'
import { listCharacterItems } from './characterItems'
import { purchaseItemForCharacter, removeOwnedItem } from './itemFlows'
import { getCatalogItemById } from './items'
import { getRegionById } from './regions'

interface PricedCatalogItem {
  id: string
  name: string
  itemType: ItemType
  rarity: ItemRarity
}

function failCommerce(
  code: 'insufficient_funds' | 'unknown_item' | 'not_owned',
  itemNameHint?: string
): CommerceResolveResult {
  return {
    ok: false,
    code,
    message: commerceFailMessage(code, itemNameHint),
    itemNameHint
  }
}

function failTravel(
  code: 'unknown_destination' | 'already_here',
  destinationNameHint?: string
): TravelResolveResult {
  return {
    ok: false,
    code,
    message: travelFailMessage(code, destinationNameHint),
    destinationNameHint
  }
}

function resolveBuy(
  db: Database.Database,
  characterId: string,
  op: 'buy' | 'trade',
  item: PricedCatalogItem
): CommerceResolveResult {
  const price = priceForItem(item.itemType, item.rarity)
  const outcome = purchaseItemForCharacter(db, characterId, item.id, price)
  if (!outcome.ok) {
    const code = outcome.reason === 'item_not_found' ? 'unknown_item' : 'insufficient_funds'
    return failCommerce(code, item.name)
  }
  return {
    ok: true,
    op,
    catalogItemId: item.id,
    itemName: item.name,
    price,
    newBalance: outcome.newBalance
  }
}

function resolveSell(
  db: Database.Database,
  characterId: string,
  item: PricedCatalogItem
): CommerceResolveResult {
  const owned = listCharacterItems(db, characterId).find((row) => row.itemId === item.id)
  if (!owned) {
    return failCommerce('not_owned', item.name)
  }
  const price = sellPriceForItem(item.itemType, item.rarity)
  if (!removeOwnedItem(db, characterId, owned.id, 1)) {
    return failCommerce('not_owned', item.name)
  }
  const credit = adjustCharacterCurrency(db, characterId, price)
  if (!credit.success) {
    return failCommerce('not_owned', item.name)
  }
  return {
    ok: true,
    op: 'sell',
    catalogItemId: item.id,
    itemName: item.name,
    price,
    newBalance: credit.newBalance
  }
}

/** Engine-owned buy/sell/trade once classification is accepted (epic 135). */
export function resolveCommerceIntent(
  db: Database.Database,
  characterId: string,
  intent: ClassifiedCommerceIntent
): CommerceResolveResult {
  if (!intent.catalogItemId) {
    return failCommerce('unknown_item', intent.itemNameHint)
  }
  const item = getCatalogItemById(db, intent.catalogItemId)
  if (!item) {
    return failCommerce('unknown_item', intent.itemNameHint)
  }
  const priced: PricedCatalogItem = {
    id: item.id,
    name: item.name,
    itemType: item.itemType,
    rarity: item.rarity
  }
  if (intent.op === 'sell') {
    return resolveSell(db, characterId, priced)
  }
  return resolveBuy(db, characterId, intent.op, priced)
}

interface TravelResolveInput {
  campaignId: string
  characterId: string
  currentRegionId: string
  intent: ClassifiedTravelIntent
}

/** Known-region travel: clamp days, advance clock, set currentRegionId. */
export function resolveTravelIntent(
  db: Database.Database,
  input: TravelResolveInput
): TravelResolveResult {
  const hint = input.intent.destinationNameHint
  if (!input.intent.regionId) {
    return failTravel('unknown_destination', hint)
  }
  const region = getRegionById(db, input.intent.regionId)
  if (!region || region.campaignId !== input.campaignId) {
    return failTravel('unknown_destination', hint)
  }
  if (region.id === input.currentRegionId) {
    return failTravel('already_here', region.name)
  }
  const days = resolveTravel(input.intent.estimatedDays)
  const inGameDateAfter = advanceInGameDate(db, input.campaignId, days)
  const character = getCharacterById(db, input.characterId)
  if (!character) {
    return failTravel('unknown_destination', hint)
  }
  updateCharacter(db, input.characterId, {
    stats: { ...(character.stats as Record<string, unknown>), currentRegionId: region.id }
  })
  const campaign = getCampaignById(db, input.campaignId)
  return {
    ok: true,
    regionId: region.id,
    regionName: region.name,
    daysAdvanced: days,
    inGameDateAfter: inGameDateAfter ?? campaign?.inGameDate ?? 0
  }
}
