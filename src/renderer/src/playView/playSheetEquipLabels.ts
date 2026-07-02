import type { CharacterItemView } from '../../../shared/items/types'
import type { EquipSlot } from '../../../shared/items/types'

export function isTwoHandMainWeapon(row: CharacterItemView | undefined): boolean {
  return row?.item.mechanicalProperties.kind === 'weapon' && row.item.mechanicalProperties.handedness === 'twoHand'
}

export function equippedItemLabel(
  slot: EquipSlot,
  row: CharacterItemView | undefined,
  mainHand?: CharacterItemView
): string {
  if (slot === 'offHand' && isTwoHandMainWeapon(mainHand)) {
    return '(two-handed)'
  }
  if (!row) {
    return 'Empty'
  }
  return row.weaponProfile?.displayName ?? row.item.name
}
