import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from './providers/mockHarness'
import { resolveItemModification } from './itemModification'
import type { WeaponDamageProfile } from '../shared/weaponModifications/types'
import type { CharacterItemView } from '../shared/items/types'

const longswordRow: CharacterItemView = {
  id: 'ci-1',
  characterId: 'char-1',
  itemId: 'item-1',
  quantity: 1,
  equippedSlot: 'mainHand',
  item: {
    id: 'item-1',
    name: 'Longsword',
    itemType: 'weapon',
    description: 'Steel blade',
    rarity: 'uncommon',
    mechanicalProperties: {
      kind: 'weapon',
      handedness: 'oneHand',
      damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 },
      damageType: 'physical'
    },
    equipSlot: 'mainHand',
    source: 'seed'
  }
}

const equippedProfile: WeaponDamageProfile = {
  characterItemId: 'ci-1',
  catalogName: 'Longsword',
  components: [{ damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 }, damageType: 'physical' }]
}

describe('resolveItemModification success', () => {
  it('returns addDamageComponent fire 1d6 for enchant-fire on equipped longsword', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        narrationText: 'Flames lick the edge.',
        modification: {
          targetCharacterItemId: 'ci-1',
          kind: 'addDamageComponent',
          damageType: 'fire',
          diceCount: 1,
          diceSize: 6
        }
      })
    ])
    const result = await resolveItemModification(provider, {
      playerInput: 'I enchant my longsword to deal fire damage',
      ownedWeapons: [longswordRow],
      equippedWeapon: equippedProfile
    })
    expect(result.modification.damageType).toBe('fire')
    expect(provider.calls[0]?.context?.maxTokens).toBe(256)
  })
})

describe('resolveItemModification validation', () => {
  it('rejects invalid target id via retry until schema failure', async () => {
    const invalid = JSON.stringify({
      narrationText: 'Nope.',
      modification: {
        targetCharacterItemId: 'not-owned',
        kind: 'addDamageComponent',
        damageType: 'fire',
        diceCount: 1,
        diceSize: 6
      }
    })
    const provider = createScriptedProvider([invalid, invalid, invalid])
    await expect(
      resolveItemModification(provider, {
        playerInput: 'enchant sword',
        ownedWeapons: [longswordRow],
        equippedWeapon: equippedProfile
      })
    ).rejects.toThrow(/valid schema/)
  })
})
