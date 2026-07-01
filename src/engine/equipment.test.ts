import { describe, expect, it } from 'vitest'
import type { CatalogItem, CharacterItemView } from '../shared/items/types'
import { slotsToClearOnEquip, validateEquip } from './equipment'

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

function owned(id: string, item: CatalogItem, equippedSlot: CharacterItemView['equippedSlot'] = null): CharacterItemView {
  return { id, characterId: 'char-1', itemId: item.id, quantity: 1, equippedSlot, item }
}

describe('equipment dual wield and shield', () => {
  it('allows dual wield and sword plus shield', () => {
    const shortsword = catalog()
    const handaxe = catalog({ id: 'item-2', name: 'Handaxe' })
    const shield = catalog({
      id: 'shield-1',
      name: 'Wooden Shield',
      itemType: 'misc',
      mechanicalProperties: { kind: 'shield', acBonus: 2 },
      equipSlot: 'offHand'
    })
    const dual = [owned('row-main', shortsword, 'mainHand'), owned('row-off', handaxe)]
    expect(validateEquip(dual, 'row-off', 'offHand')).toEqual({ ok: true })
    const withShield = [owned('row-main', shortsword, 'mainHand'), owned('row-shield', shield)]
    expect(validateEquip(withShield, 'row-shield', 'offHand')).toEqual({ ok: true })
  })
})

describe('equipment two-hand rules', () => {
  it('blocks offHand when mainHand holds 2H and clears offHand on 2H equip', () => {
    const greataxe = catalog({
      id: 'item-3',
      name: 'Greataxe',
      mechanicalProperties: {
        kind: 'weapon',
        damageRoll: { diceCount: 1, diceSize: 12, modifier: 0 },
        damageType: 'physical',
        handedness: 'twoHand'
      }
    })
    const handaxe = catalog({ id: 'item-2', name: 'Handaxe' })
    const blocked = [owned('row-2h', greataxe, 'mainHand'), owned('row-off', handaxe)]
    expect(validateEquip(blocked, 'row-off', 'offHand')).toEqual({
      ok: false,
      reason: 'off_hand_blocked_by_two_hand'
    })
    const clearOff = [owned('row-off', handaxe, 'offHand'), owned('row-2h', greataxe)]
    expect(slotsToClearOnEquip(clearOff, greataxe, 'mainHand', 'row-2h')).toContain('row-off')
  })
})
