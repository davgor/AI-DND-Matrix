import { describe, expect, it } from 'vitest'
import type { CatalogItem } from '../shared/items/types'
import { getValidEquipSlots } from './equipment'

function catalog(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: 'item-1',
    name: 'Shortsword',
    itemType: 'weapon',
    description: 'A blade.',
    rarity: 'common',
    mechanicalProperties: {
      kind: 'weapon',
      damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 },
      damageType: 'physical',
      handedness: 'oneHand'
    },
    equipSlot: 'mainHand',
    source: 'seed',
    ...overrides
  }
}

describe('getValidEquipSlots', () => {
  it('allows 1H weapons in both hands', () => {
    expect(getValidEquipSlots(catalog())).toEqual(['mainHand', 'offHand'])
  })

  it('restricts 2H weapons to mainHand', () => {
    const greataxe = catalog({
      name: 'Greataxe',
      mechanicalProperties: {
        kind: 'weapon',
        damageRoll: { diceCount: 1, diceSize: 12, modifier: 0 },
        damageType: 'physical',
        handedness: 'twoHand'
      }
    })
    expect(getValidEquipSlots(greataxe)).toEqual(['mainHand'])
  })
})
