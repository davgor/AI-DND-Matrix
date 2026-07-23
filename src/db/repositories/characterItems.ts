import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { validateEquip, slotsToClearOnEquip, getValidEquipSlots, type EquipFailureReason } from '../../engine/equipment'
import type { ArmorTier } from '../../engine/armorClass'
import { ACCESSORY_EQUIP_SLOTS, type CharacterItemView, type EquipSlot } from '../../shared/items/types'
import { getCatalogItemById } from './items'
import { enrichCharacterItemViews } from './weaponDamageProfile'

export { getEquippedWeaponDamageProfile, getEquippedWeaponDamageRoll } from './weaponDamageProfile'

interface CharacterItemRow {
  id: string
  character_id: string
  item_id: string
  quantity: number
  equipped_slot: EquipSlot | null
}

function rowToView(db: Database.Database, row: CharacterItemRow): CharacterItemView | undefined {
  const item = getCatalogItemById(db, row.item_id)
  if (!item) {
    return undefined
  }
  return {
    id: row.id,
    characterId: row.character_id,
    itemId: row.item_id,
    quantity: row.quantity,
    equippedSlot: row.equipped_slot,
    item
  }
}

export function listCharacterItems(db: Database.Database, characterId: string): CharacterItemView[] {
  const rows = db
    .prepare('SELECT * FROM character_items WHERE character_id = ? ORDER BY rowid')
    .all(characterId) as CharacterItemRow[]
  const views = rows
    .map((row) => rowToView(db, row))
    .filter((row): row is CharacterItemView => row !== undefined)
  return enrichCharacterItemViews(db, views)
}

export function addItemToCharacter(
  db: Database.Database,
  characterId: string,
  itemId: string,
  quantity = 1
): CharacterItemView {
  const existing = db
    .prepare('SELECT * FROM character_items WHERE character_id = ? AND item_id = ?')
    .get(characterId, itemId) as CharacterItemRow | undefined

  if (existing) {
    const nextQuantity = existing.quantity + quantity
    db.prepare('UPDATE character_items SET quantity = ? WHERE id = ?').run(nextQuantity, existing.id)
    const updated = rowToView(db, { ...existing, quantity: nextQuantity })
    if (!updated) {
      throw new Error(`Item ${itemId} missing from catalog`)
    }
    return updated
  }

  const id = randomUUID()
  db.prepare(
    `INSERT INTO character_items (id, character_id, item_id, quantity, equipped_slot)
     VALUES (?, ?, ?, ?, NULL)`
  ).run(id, characterId, itemId, quantity)

  const created = rowToView(db, {
    id,
    character_id: characterId,
    item_id: itemId,
    quantity,
    equipped_slot: null
  })
  if (!created) {
    throw new Error(`Item ${itemId} missing from catalog`)
  }
  return created
}

export function decrementCharacterItem(
  db: Database.Database,
  characterId: string,
  itemId: string,
  quantity = 1
): boolean {
  const row = db
    .prepare('SELECT * FROM character_items WHERE character_id = ? AND item_id = ?')
    .get(characterId, itemId) as CharacterItemRow | undefined
  if (!row || row.quantity < quantity) {
    return false
  }
  if (row.quantity === quantity) {
    db.prepare('DELETE FROM character_items WHERE id = ?').run(row.id)
    return true
  }
  db.prepare('UPDATE character_items SET quantity = ? WHERE id = ?').run(row.quantity - quantity, row.id)
  return true
}

export type EquipItemResult = { ok: true } | { ok: false; reason: EquipFailureReason }

export function equipCharacterItem(
  db: Database.Database,
  characterId: string,
  characterItemId: string,
  slot: EquipSlot
): EquipItemResult {
  const items = listCharacterItems(db, characterId)
  const owned = items.find((row) => row.id === characterItemId)
  if (!owned) {
    return { ok: false, reason: 'not_owned' }
  }
  const validation = validateEquip(items, characterItemId, slot)
  if (!validation.ok) {
    return validation
  }

  const clearIds = slotsToClearOnEquip(items, owned.item, slot, characterItemId)
  const clearStmt = db.prepare('UPDATE character_items SET equipped_slot = NULL WHERE id = ?')
  for (const id of clearIds) {
    clearStmt.run(id)
  }
  db.prepare('UPDATE character_items SET equipped_slot = ? WHERE id = ?').run(slot, characterItemId)
  return { ok: true }
}

export function unequipCharacterSlot(
  db: Database.Database,
  characterId: string,
  slot: EquipSlot
): void {
  db.prepare(
    'UPDATE character_items SET equipped_slot = NULL WHERE character_id = ? AND equipped_slot = ?'
  ).run(characterId, slot)
}

export function getEquippedArmorTier(db: Database.Database, characterId: string): ArmorTier {
  const equipped = listCharacterItems(db, characterId).find((row) => row.equippedSlot === 'armor')
  if (!equipped || equipped.item.mechanicalProperties.kind !== 'armor') {
    return 'none'
  }
  return equipped.item.mechanicalProperties.armorTier
}

export function getEquippedShieldBonus(db: Database.Database, characterId: string): number {
  const equipped = listCharacterItems(db, characterId).find((row) => row.equippedSlot === 'offHand')
  if (!equipped || equipped.item.mechanicalProperties.kind !== 'shield') {
    return 0
  }
  return equipped.item.mechanicalProperties.acBonus
}

export interface AccessoryBonuses {
  acBonus: number
  attackBonus: number
}

export function getEquippedAccessoryBonuses(db: Database.Database, characterId: string): AccessoryBonuses {
  const accessorySlots = new Set<string>(ACCESSORY_EQUIP_SLOTS)
  let acBonus = 0
  let attackBonus = 0
  for (const row of listCharacterItems(db, characterId)) {
    if (!row.equippedSlot || !accessorySlots.has(row.equippedSlot)) {
      continue
    }
    if (row.item.mechanicalProperties.kind !== 'magicItem') {
      continue
    }
    acBonus += row.item.mechanicalProperties.acBonus
    attackBonus += row.item.mechanicalProperties.attackBonus
  }
  return { acBonus, attackBonus }
}

export function getValidEquipSlotsForItem(item: CharacterItemView['item']): EquipSlot[] {
  return getValidEquipSlots(item)
}

export function unequipCharacterItemRow(db: Database.Database, characterItemId: string): void {
  db.prepare('UPDATE character_items SET equipped_slot = NULL WHERE id = ?').run(characterItemId)
}

export function removeCharacterItemRow(db: Database.Database, characterItemId: string): void {
  db.prepare('DELETE FROM character_items WHERE id = ?').run(characterItemId)
}

export function clearCharacterItems(db: Database.Database, characterId: string): void {
  db.prepare('DELETE FROM character_items WHERE character_id = ?').run(characterId)
}
