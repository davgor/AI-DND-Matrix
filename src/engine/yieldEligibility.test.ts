import { describe, expect, it } from 'vitest'
import { checkYieldEligibility } from './yieldEligibility'

describe('checkYieldEligibility: villager tier', () => {
  it('triggers yield at 50% HP', () => {
    const result = checkYieldEligibility({
      combatTier: 'villager',
      temperament: 'neutral',
      hp: 5,
      maxHp: 10,
      wouldKill: false,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(true)
    expect(result.suggestedOutcomes).toContain('surrender')
    expect(result.suggestedOutcomes).toContain('flee')
  })

  it('triggers yield when would-kill even above 50%', () => {
    const result = checkYieldEligibility({
      combatTier: 'villager',
      temperament: 'neutral',
      hp: 0,
      maxHp: 10,
      wouldKill: true,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(true)
  })

  it('no yield above 50% without kill', () => {
    const result = checkYieldEligibility({
      combatTier: 'villager',
      temperament: 'neutral',
      hp: 7,
      maxHp: 10,
      wouldKill: false,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(false)
  })
})

describe('checkYieldEligibility: villager speech', () => {
  it('removes surrender when canSpeak is false', () => {
    const result = checkYieldEligibility({
      combatTier: 'villager',
      temperament: 'neutral',
      hp: 4,
      maxHp: 10,
      wouldKill: false,
      canSpeak: false
    })
    expect(result.yieldCheckRequired).toBe(true)
    expect(result.suggestedOutcomes).not.toContain('surrender')
    expect(result.suggestedOutcomes).toContain('flee')
    expect(result.suggestedOutcomes).toContain('incapacitated')
  })
})

describe('checkYieldEligibility: skittish and cautious', () => {
  it('skittish triggers at 50% HP', () => {
    const result = checkYieldEligibility({
      combatTier: 'catalog',
      temperament: 'skittish',
      hp: 5,
      maxHp: 10,
      wouldKill: false,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(true)
  })

  it('cautious triggers at 50% HP', () => {
    const result = checkYieldEligibility({
      combatTier: 'catalog',
      temperament: 'cautious',
      hp: 5,
      maxHp: 10,
      wouldKill: false,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(true)
  })
})

describe('checkYieldEligibility: aggressive disciplined mindless', () => {
  it('aggressive does not trigger before 0 HP', () => {
    const result = checkYieldEligibility({
      combatTier: 'catalog',
      temperament: 'aggressive',
      hp: 2,
      maxHp: 10,
      wouldKill: false,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(false)
  })

  it('aggressive triggers only at would-kill', () => {
    const result = checkYieldEligibility({
      combatTier: 'catalog',
      temperament: 'aggressive',
      hp: 0,
      maxHp: 10,
      wouldKill: true,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(true)
  })

  it('mindless never offers surrender in suggested outcomes', () => {
    const result = checkYieldEligibility({
      combatTier: 'catalog',
      temperament: 'mindless',
      hp: 0,
      maxHp: 10,
      wouldKill: true,
      canSpeak: false
    })
    expect(result.yieldCheckRequired).toBe(true)
    expect(result.suggestedOutcomes).not.toContain('surrender')
    expect(result.suggestedOutcomes).toContain('flee')
    expect(result.suggestedOutcomes).toContain('incapacitated')
  })

  it('disciplined triggers only at would-kill', () => {
    const result = checkYieldEligibility({
      combatTier: 'catalog',
      temperament: 'disciplined',
      hp: 1,
      maxHp: 10,
      wouldKill: false,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(false)
  })
})

describe('checkYieldEligibility: retired_adventurer tier', () => {
  it('triggers at 25% HP', () => {
    const result = checkYieldEligibility({
      combatTier: 'retired_adventurer',
      temperament: 'disciplined',
      hp: 2,
      maxHp: 10,
      wouldKill: false,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(true)
    expect(result.suggestedOutcomes).toContain('surrender')
  })

  it('does not trigger between 25% and 50%', () => {
    const result = checkYieldEligibility({
      combatTier: 'retired_adventurer',
      temperament: 'disciplined',
      hp: 4,
      maxHp: 10,
      wouldKill: false,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(false)
  })

  it('triggers at would-kill', () => {
    const result = checkYieldEligibility({
      combatTier: 'retired_adventurer',
      temperament: 'disciplined',
      hp: 0,
      maxHp: 10,
      wouldKill: true,
      canSpeak: true
    })
    expect(result.yieldCheckRequired).toBe(true)
  })
})
