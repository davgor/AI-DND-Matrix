import { describe, expect, it } from 'vitest'
import type { StartingLoadoutOffer } from '../../../shared/startingLoadout/types'
import { STARTING_OFF_HAND_EMPTY } from '../../../engine/startingLoadout/packages'
import {
  canConfirmEquipmentSelection,
  initialEquipmentSelectionState,
  isTwoHandWeaponSelected,
  offHandOptionDisabled,
  resolveOffHandAfterWeaponChange,
  toggleSpellSelection
} from './equipmentSelectionLogic'

const fighterOffer: StartingLoadoutOffer = {
  archetype: 'fighter',
  weapons: [
    { name: 'Longsword', description: 'sword', handedness: 'oneHand' },
    { name: 'Greataxe', description: 'axe', handedness: 'twoHand' }
  ],
  armors: [{ name: 'Chain Hauberk', description: 'mail' }],
  offHand: [
    { id: 'Wooden Shield', label: 'Wooden Shield' },
    { id: STARTING_OFF_HAND_EMPTY, label: 'Empty' }
  ],
  spells: [{ key: 'rallying-strike', name: 'Rallying Strike', effectType: 'damage', range: 'melee', cost: 1, tags: ['morale'] }],
  spellPickCount: 1
}

describe('equipmentSelectionLogic', () => {
  it('renders off-hand mutual exclusion for two-handed weapons', () => {
    expect(isTwoHandWeaponSelected(fighterOffer, 'Greataxe')).toBe(true)
    expect(offHandOptionDisabled(fighterOffer, 'Greataxe', 'Wooden Shield')).toBe(true)
    expect(
      resolveOffHandAfterWeaponChange(fighterOffer, 'Greataxe', 'Wooden Shield')
    ).toBe(STARTING_OFF_HAND_EMPTY)
  })

  it('blocks confirm until required picks are made', () => {
    const state = initialEquipmentSelectionState(fighterOffer)
    expect(canConfirmEquipmentSelection(fighterOffer, state)).toBe(false)
    const ready = {
      ...state,
      weaponName: 'Longsword',
      armorName: 'Chain Hauberk',
      offHandChoice: 'Wooden Shield',
      spellKeys: ['rallying-strike']
    }
    expect(canConfirmEquipmentSelection(fighterOffer, ready)).toBe(true)
  })

  it('enforces spell pick limit', () => {
    expect(toggleSpellSelection([], 'firebolt', 2)).toEqual(['firebolt'])
    expect(toggleSpellSelection(['firebolt'], 'arcane-bolt', 2)).toEqual(['firebolt', 'arcane-bolt'])
    expect(toggleSpellSelection(['firebolt', 'arcane-bolt'], 'frost-shard', 2)).toEqual([
      'firebolt',
      'arcane-bolt'
    ])
  })
})
