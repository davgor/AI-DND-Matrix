import { describe, expect, it } from 'vitest'
import { applyPerk, characterHasExtraAttack, PERK_AC_STACK_CAP, readPerkAcBonus } from './perks'
import type { PerkProposal } from '../shared/progression/types'

const alwaysValid = (): boolean => true
const alwaysInvalid = (): boolean => false

function proposal(overrides: Partial<PerkProposal> & Pick<PerkProposal, 'category'>): PerkProposal {
  return {
    id: 'p1',
    name: 'Test Perk',
    description: 'A test perk.',
    flavorTags: ['test'],
    ...overrides
  }
}

describe('applyPerk martial categories', () => {
  it('applies ac_bonus deterministically', () => {
    const result = applyPerk({
      proposal: proposal({ category: 'ac_bonus' }),
      levelGained: 2,
      stats: {},
      validateSpellKey: alwaysValid
    })
    expect(readPerkAcBonus(result.stats)).toBe(1)
  })

  it('caps ac_bonus stacks', () => {
    const result = applyPerk({
      proposal: proposal({ category: 'ac_bonus', id: 'cap' }),
      levelGained: 5,
      stats: { perkAcBonus: PERK_AC_STACK_CAP },
      validateSpellKey: alwaysValid
    })
    expect(readPerkAcBonus(result.stats)).toBe(PERK_AC_STACK_CAP)
  })

  it('sets extra_attack flag', () => {
    const result = applyPerk({
      proposal: proposal({ category: 'extra_attack' }),
      levelGained: 3,
      stats: {},
      validateSpellKey: alwaysValid
    })
    expect(characterHasExtraAttack(result.stats)).toBe(true)
  })
})

describe('applyPerk spell and feature categories', () => {
  it('grants spell_access when catalog key validates', () => {
    const result = applyPerk({
      proposal: proposal({ category: 'spell_access', catalogSpellKey: 'firebolt' }),
      levelGained: 2,
      stats: {},
      validateSpellKey: alwaysValid
    })
    expect((result.stats as { knownSpellKeys?: string[] }).knownSpellKeys).toContain('firebolt')
  })

  it('fails closed on invalid spell_access key', () => {
    expect(() =>
      applyPerk({
        proposal: proposal({ category: 'spell_access', catalogSpellKey: 'fake' }),
        levelGained: 2,
        stats: {},
        validateSpellKey: alwaysInvalid
      })
    ).toThrow(/Invalid catalog spell key/)
  })

  it('creates custom_feature from template', () => {
    const result = applyPerk({
      proposal: proposal({ category: 'custom_feature', flavorTags: ['arcane'] }),
      levelGained: 5,
      stats: {},
      validateSpellKey: alwaysValid
    })
    const features = (result.stats as { customFeatures?: Array<{ effectDice: number }> }).customFeatures
    expect(features?.[0]?.effectDice).toBeGreaterThan(0)
  })
})
