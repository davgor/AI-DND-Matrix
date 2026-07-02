import type { EquipSlot } from '../shared/items/types'
import { ACCESSORY_EQUIP_SLOTS } from '../shared/items/types'
import type { CatalogItem, CharacterItemView, WeaponHandedness } from '../shared/items/types'

export type EquipFailureReason =
  | 'not_owned'
  | 'not_equippable'
  | 'slot_mismatch'
  | 'off_hand_blocked_by_two_hand'
  | 'two_hand_blocks_off_hand'
  | 'shield_blocks_two_hand'

export type EquipResult = { ok: true } | { ok: false; reason: EquipFailureReason }

export function itemEquipSlot(item: CatalogItem): EquipSlot | null {
  return item.equipSlot
}

export function weaponHandedness(item: CatalogItem): WeaponHandedness | null {
  if (item.mechanicalProperties.kind !== 'weapon') {
    return null
  }
  return item.mechanicalProperties.handedness
}

export function isShieldItem(item: CatalogItem): boolean {
  return item.mechanicalProperties.kind === 'shield'
}

export function isTwoHandWeapon(item: CatalogItem): boolean {
  return weaponHandedness(item) === 'twoHand'
}

export function getValidEquipSlots(item: CatalogItem): EquipSlot[] {
  if (item.mechanicalProperties.kind === 'weapon') {
    if (item.mechanicalProperties.handedness === 'twoHand') {
      return ['mainHand']
    }
    return ['mainHand', 'offHand']
  }
  if (item.mechanicalProperties.kind === 'shield') {
    return ['offHand']
  }
  if (item.equipSlot) {
    return [item.equipSlot]
  }
  return []
}

export function canEquipItem(item: CatalogItem, slot: EquipSlot): boolean {
  return getValidEquipSlots(item).includes(slot)
}

export function findEquippedInSlot(
  items: CharacterItemView[],
  slot: EquipSlot
): CharacterItemView | undefined {
  return items.find((row) => row.equippedSlot === slot)
}

function mainHandItem(items: CharacterItemView[]): CharacterItemView | undefined {
  return findEquippedInSlot(items, 'mainHand')
}

function mainHandHasTwoHand(items: CharacterItemView[]): boolean {
  const main = mainHandItem(items)
  return main !== undefined && isTwoHandWeapon(main.item)
}

export function validateEquip(
  items: CharacterItemView[],
  characterItemId: string,
  slot: EquipSlot,
  exceptCharacterItemId?: string
): EquipResult {
  const owned = items.find((row) => row.id === characterItemId)
  if (!owned) {
    return { ok: false, reason: 'not_owned' }
  }
  if (!owned.item.equipSlot && getValidEquipSlots(owned.item).length === 0) {
    return { ok: false, reason: 'not_equippable' }
  }
  if (!canEquipItem(owned.item, slot)) {
    return { ok: false, reason: 'slot_mismatch' }
  }

  const others = items.filter((row) => row.id !== characterItemId && row.id !== exceptCharacterItemId)

  if (slot === 'offHand' && mainHandHasTwoHand(others)) {
    if (!isShieldItem(owned.item)) {
      return { ok: false, reason: 'off_hand_blocked_by_two_hand' }
    }
  }

  return { ok: true }
}

export function slotsAffectedOnEquip(
  items: CharacterItemView[],
  item: CatalogItem,
  targetSlot: EquipSlot,
  exceptCharacterItemId: string
): EquipSlot[] {
  const slots: EquipSlot[] = [targetSlot]

  if (targetSlot === 'mainHand' && isTwoHandWeapon(item)) {
    slots.push('offHand')
  }

  if (targetSlot === 'offHand' && isShieldItem(item)) {
    const main = mainHandItem(items.filter((row) => row.id !== exceptCharacterItemId))
    if (main && isTwoHandWeapon(main.item)) {
      slots.push('mainHand')
    }
  }

  return [...new Set(slots)]
}

export function slotsToClearOnEquip(
  items: CharacterItemView[],
  item: CatalogItem,
  targetSlot: EquipSlot,
  exceptCharacterItemId: string
): string[] {
  const affectedSlots = slotsAffectedOnEquip(items, item, targetSlot, exceptCharacterItemId)
  return items
    .filter(
      (row) =>
        row.equippedSlot !== null &&
        affectedSlots.includes(row.equippedSlot) &&
        row.id !== exceptCharacterItemId
    )
    .map((row) => row.id)
}

export function listAccessorySlots(): readonly EquipSlot[] {
  return ACCESSORY_EQUIP_SLOTS
}
