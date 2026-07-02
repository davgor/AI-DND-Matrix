import { describe, expect, it } from 'vitest'
import type { CharacterItemView } from '../../../shared/items/types'
import { equippedItemLabel } from './playSheetEquipLabels'

function weaponRow(handedness: 'oneHand' | 'twoHand', name: string): CharacterItemView {
  return {
    id: 'row-1',
    characterId: 'char-1',
    itemId: 'item-1',
    quantity: 1,
    equippedSlot: 'mainHand',
    item: {
      id: 'item-1',
      name,
      itemType: 'weapon',
      description: '',
      rarity: 'common',
      equipSlot: 'mainHand',
      source: 'seed',
      mechanicalProperties: {
        kind: 'weapon',
        handedness,
        damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 },
        damageType: 'physical'
      }
    }
  }
}

describe('equippedItemLabel', () => {
  it('marks off hand as two-handed when main hand holds a 2H weapon', () => {
    const mainHand = weaponRow('twoHand', 'Greataxe')
    expect(equippedItemLabel('offHand', undefined, mainHand)).toBe('(two-handed)')
  })

  it('shows item names for equipped accessories', () => {
    const ring: CharacterItemView = {
      id: 'row-ring',
      characterId: 'char-1',
      itemId: 'item-ring',
      quantity: 1,
      equippedSlot: 'ring1',
      item: {
        id: 'item-ring',
        name: 'Ring of Warding',
        itemType: 'magicItem',
        description: '',
        rarity: 'uncommon',
        equipSlot: 'ring1',
        source: 'seed',
        mechanicalProperties: { kind: 'magicItem', acBonus: 1, attackBonus: 0, accessorySlot: 'ring1' }
      }
    }
    expect(equippedItemLabel('ring1', ring)).toBe('Ring of Warding')
  })
})
