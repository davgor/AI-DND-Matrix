import type { EquipSlot } from '../shared/items/types'
import type { CatalogItem, CharacterItemView } from '../shared/items/types'

export type EquipFailureReason = 'not_owned' | 'not_equippable' | 'slot_mismatch'

export type EquipResult = { ok: true } | { ok: false; reason: EquipFailureReason }

export function itemEquipSlot(item: CatalogItem): EquipSlot | null {
  return item.equipSlot
}

export function canEquipItem(item: CatalogItem, slot: EquipSlot): boolean {
  return item.equipSlot === slot
}

export function findEquippedInSlot(
  items: CharacterItemView[],
  slot: EquipSlot
): CharacterItemView | undefined {
  return items.find((row) => row.equippedSlot === slot)
}

export function validateEquip(
  items: CharacterItemView[],
  characterItemId: string,
  slot: EquipSlot
): EquipResult {
  const owned = items.find((row) => row.id === characterItemId)
  if (!owned) {
    return { ok: false, reason: 'not_owned' }
  }
  if (!owned.item.equipSlot) {
    return { ok: false, reason: 'not_equippable' }
  }
  if (!canEquipItem(owned.item, slot)) {
    return { ok: false, reason: 'slot_mismatch' }
  }
  return { ok: true }
}

export function slotsToClearOnEquip(
  items: CharacterItemView[],
  slot: EquipSlot,
  exceptCharacterItemId: string
): string[] {
  return items
    .filter((row) => row.equippedSlot === slot && row.id !== exceptCharacterItemId)
    .map((row) => row.id)
}
