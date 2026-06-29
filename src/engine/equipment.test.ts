import { describe, expect, it } from 'vitest'
import type { CatalogItem, CharacterItemView } from '../shared/items/types'
import { findEquippedInSlot, slotsToClearOnEquip, validateEquip } from './equipment'

function catalog(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: 'item-1',
    name: 'Longsword',
    itemType: 'weapon',
    description: 'A steel blade.',
    rarity: 'common',
    mechanicalProperties: {
      kind: 'weapon',
      damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 },
      damageType: 'physical'
    },
    equipSlot: 'weapon',
    source: 'seed',
    ...overrides
  }
}

function owned(
  id: string,
  item: CatalogItem,
  equippedSlot: CharacterItemView['equippedSlot'] = null
): CharacterItemView {
  return {
    id,
    characterId: 'char-1',
    itemId: item.id,
    quantity: 1,
    equippedSlot,
    item
  }
}

describe('equipment slot rules', () => {
  const sword = catalog()
  const potion = catalog({
    id: 'item-3',
    name: 'Healing draught',
    itemType: 'potion',
    equipSlot: null,
    mechanicalProperties: { kind: 'potion', healAmount: 7 }
  })

  it('rejects equipping a potion', () => {
    const items = [owned('row-3', potion)]
    expect(validateEquip(items, 'row-3', 'weapon')).toEqual({ ok: false, reason: 'not_equippable' })
  })

  it('rejects a slot mismatch', () => {
    const items = [owned('row-1', sword)]
    expect(validateEquip(items, 'row-1', 'armor')).toEqual({ ok: false, reason: 'slot_mismatch' })
  })

  it('accepts a valid equip', () => {
    const items = [owned('row-1', sword)]
    expect(validateEquip(items, 'row-1', 'weapon')).toEqual({ ok: true })
  })

  it('identifies the item occupying a slot for swap-on-equip', () => {
    const oldSword = catalog({ id: 'item-old', name: 'Dagger', equipSlot: 'weapon' })
    const items = [owned('row-old', oldSword, 'weapon'), owned('row-new', sword)]
    expect(findEquippedInSlot(items, 'weapon')?.id).toBe('row-old')
    expect(slotsToClearOnEquip(items, 'weapon', 'row-new')).toEqual(['row-old'])
  })
})
