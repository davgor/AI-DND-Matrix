import type Database from 'better-sqlite3'
import { adjustCharacterCurrency } from './characters'
import {
  addItemToCharacter,
  decrementCharacterItem,
  listCharacterItems,
  removeCharacterItemRow,
  unequipCharacterItemRow
} from './characterItems'
import { getCatalogItemById } from './items'
import { updateCharacter, getCharacterById } from './characters'

export type GrantItemResult = { ok: true } | { ok: false; reason: 'item_not_found' }

export function grantItemToCharacter(
  db: Database.Database,
  characterId: string,
  itemId: string,
  quantity = 1
): GrantItemResult {
  if (!getCatalogItemById(db, itemId)) {
    return { ok: false, reason: 'item_not_found' }
  }
  addItemToCharacter(db, characterId, itemId, quantity)
  return { ok: true }
}

export type PurchaseItemResult =
  | { ok: true; newBalance: number }
  | { ok: false; reason: 'item_not_found' | 'insufficient_funds' }

export function purchaseItemForCharacter(
  db: Database.Database,
  characterId: string,
  itemId: string,
  price: number
): PurchaseItemResult {
  if (!getCatalogItemById(db, itemId)) {
    return { ok: false, reason: 'item_not_found' }
  }
  const debit = adjustCharacterCurrency(db, characterId, -price)
  if (!debit.success) {
    return { ok: false, reason: 'insufficient_funds' }
  }
  addItemToCharacter(db, characterId, itemId, 1)
  return { ok: true, newBalance: debit.newBalance }
}

export type ConsumePotionResult =
  | { ok: true; hpAfter: number }
  | { ok: false; reason: 'not_owned' | 'not_potion' }

export function consumePotion(db: Database.Database, characterId: string, itemId: string): ConsumePotionResult {
  const item = getCatalogItemById(db, itemId)
  const character = getCharacterById(db, characterId)
  if (!item || !character) {
    return { ok: false, reason: 'not_owned' }
  }
  if (item.mechanicalProperties.kind !== 'potion') {
    return { ok: false, reason: 'not_potion' }
  }
  const owned = listCharacterItems(db, characterId).find((row) => row.itemId === itemId)
  if (!owned) {
    return { ok: false, reason: 'not_owned' }
  }
  if (owned.equippedSlot) {
    unequipCharacterItemRow(db, owned.id)
  }
  const hpAfter = character.hp + item.mechanicalProperties.healAmount
  updateCharacter(db, characterId, { hp: hpAfter })
  decrementCharacterItem(db, characterId, itemId, 1)
  return { ok: true, hpAfter }
}

export function removeOwnedItem(
  db: Database.Database,
  characterId: string,
  characterItemId: string,
  quantity = 1
): boolean {
  const owned = listCharacterItems(db, characterId).find((row) => row.id === characterItemId)
  if (!owned || owned.quantity < quantity) {
    return false
  }
  if (owned.equippedSlot) {
    unequipCharacterItemRow(db, owned.id)
  }
  if (owned.quantity === quantity) {
    removeCharacterItemRow(db, owned.id)
    return true
  }
  decrementCharacterItem(db, characterId, owned.itemId, quantity)
  return true
}
