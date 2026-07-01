import type { EquipSlot, WeaponHandedness } from '../../shared/items/types'
import { inferAccessorySlotFromName } from './migrateEquipSlotsAccessory'

const NEW_EQUIP_SLOT_CHECK = `(
  'armor', 'mainHand', 'offHand',
  'head', 'hands', 'feet', 'belt', 'neck', 'ring1', 'ring2'
)`

export { inferAccessorySlotFromName } from './migrateEquipSlotsAccessory'

export function migrateEquipSlotValue(legacySlot: string | null, itemName: string): EquipSlot | null {
  if (legacySlot === null) {
    return null
  }
  if (legacySlot === 'weapon') {
    return 'mainHand'
  }
  if (legacySlot === 'armor') {
    return 'armor'
  }
  if (legacySlot === 'trinket') {
    return inferAccessorySlotFromName(itemName)
  }
  return legacySlot as EquipSlot
}

export function inferWeaponHandedness(name: string): WeaponHandedness {
  const lower = name.toLowerCase()
  if (
    lower.includes('great') ||
    lower.includes('greataxe') ||
    lower.includes('two-hand') ||
    lower.includes('two hand') ||
    lower.includes('halberd') ||
    lower.includes('maul')
  ) {
    return 'twoHand'
  }
  return 'oneHand'
}

export { NEW_EQUIP_SLOT_CHECK }
