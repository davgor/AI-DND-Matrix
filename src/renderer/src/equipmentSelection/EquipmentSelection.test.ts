import { describe, expect, it } from 'vitest'
import type { StartingLoadoutOffer } from '../../../shared/startingLoadout/types'
import { STARTING_OFF_HAND_EMPTY } from '../../../engine/startingLoadout/packages'
import {
  canConfirmEquipmentSelection,
  hydrateEquipmentSelectionState,
  initialEquipmentSelectionState,
  isTwoHandWeaponSelected,
  offHandOptionDisabled,
  resolveInitialEquipmentSelectionState,
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
  spells: [
    {
      key: 'rallying-strike',
      name: 'Rallying Strike',
      effectType: 'damage',
      range: 'melee',
      cost: 1,
      tags: ['morale']
    }
  ],
  spellPickCount: 1
}

describe('equipmentSelectionLogic picks', () => {
  it('renders off-hand mutual exclusion for two-handed weapons', () => {
    expect(isTwoHandWeaponSelected(fighterOffer, 'Greataxe')).toBe(true)
    expect(offHandOptionDisabled(fighterOffer, 'Greataxe', 'Wooden Shield')).toBe(true)
    expect(resolveOffHandAfterWeaponChange(fighterOffer, 'Greataxe', 'Wooden Shield')).toBe(
      STARTING_OFF_HAND_EMPTY
    )
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

describe('equipmentSelectionLogic persistence', () => {
  it('hydrates selection from previously applied starting gear', () => {
    const hydrated = hydrateEquipmentSelectionState(fighterOffer, {
      weaponName: 'Longsword',
      armorName: 'Chain Hauberk',
      offHandItemName: 'Wooden Shield',
      spellKeys: ['rallying-strike']
    })
    expect(hydrated).toEqual({
      weaponName: 'Longsword',
      armorName: 'Chain Hauberk',
      offHandChoice: 'Wooden Shield',
      spellKeys: ['rallying-strike']
    })
  })

  it('prefers applied gear over an in-progress draft when resolving initial state', () => {
    const draft = {
      weaponName: 'Greataxe',
      armorName: 'Chain Hauberk',
      offHandChoice: STARTING_OFF_HAND_EMPTY,
      spellKeys: ['rallying-strike']
    }
    const resolved = resolveInitialEquipmentSelectionState(
      fighterOffer,
      {
        weaponName: 'Longsword',
        armorName: 'Chain Hauberk',
        offHandItemName: 'Wooden Shield',
        spellKeys: ['rallying-strike']
      },
      draft
    )
    expect(resolved.weaponName).toBe('Longsword')
    expect(resolved.offHandChoice).toBe('Wooden Shield')
  })

  it('falls back to draft when no applied gear is present', () => {
    const draft = {
      weaponName: 'Greataxe',
      armorName: 'Chain Hauberk',
      offHandChoice: STARTING_OFF_HAND_EMPTY,
      spellKeys: ['rallying-strike']
    }
    expect(resolveInitialEquipmentSelectionState(fighterOffer, null, draft)).toEqual(draft)
  })
})
