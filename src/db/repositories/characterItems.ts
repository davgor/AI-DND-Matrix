import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { validateEquip, slotsToClearOnEquip, type EquipFailureReason } from '../../engine/equipment'
import type { ArmorTier } from '../../engine/armorClass'
import type { DamageRoll } from '../../engine/damage'
import { UNARMED_DAMAGE_ROLL } from '../../engine/itemTemplate'
import type { CharacterItemView, EquipSlot } from '../../shared/items/types'
import { getCatalogItemById } from './items'

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
  return rows
    .map((row) => rowToView(db, row))
    .filter((row): row is CharacterItemView => row !== undefined)
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
  const validation = validateEquip(items, characterItemId, slot)
  if (!validation.ok) {
    return validation
  }

  const clearIds = slotsToClearOnEquip(items, slot, characterItemId)
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

export function getEquippedWeaponDamageRoll(
  db: Database.Database,
  characterId: string
): DamageRoll {
  const equipped = listCharacterItems(db, characterId).find((row) => row.equippedSlot === 'weapon')
  if (!equipped || equipped.item.mechanicalProperties.kind !== 'weapon') {
    return UNARMED_DAMAGE_ROLL
  }
  return equipped.item.mechanicalProperties.damageRoll
}

export function unequipCharacterItemRow(db: Database.Database, characterItemId: string): void {
  db.prepare('UPDATE character_items SET equipped_slot = NULL WHERE id = ?').run(characterItemId)
}

export function removeCharacterItemRow(db: Database.Database, characterItemId: string): void {
  db.prepare('DELETE FROM character_items WHERE id = ?').run(characterItemId)
}
