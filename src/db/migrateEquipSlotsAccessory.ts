import type { AccessoryEquipSlot } from '../../shared/items/types'

const NAME_SLOT_RULES: Array<{ pattern: RegExp; slot: AccessoryEquipSlot }> = [
  { pattern: /ring/, slot: 'ring1' },
  { pattern: /boot|greave|feet/, slot: 'feet' },
  { pattern: /belt|sash/, slot: 'belt' },
  { pattern: /helm|head|circlet/, slot: 'head' },
  { pattern: /glove|gauntlet|hand/, slot: 'hands' },
  { pattern: /neck|amulet|pendant/, slot: 'neck' }
]

export function inferAccessorySlotFromName(name: string): AccessoryEquipSlot {
  const lower = name.toLowerCase()
  for (const rule of NAME_SLOT_RULES) {
    if (rule.pattern.test(lower)) {
      return rule.slot
    }
  }
  return 'ring1'
}
