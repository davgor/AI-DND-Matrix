import { describe, expect, it } from 'vitest'
import { resolveLootPolicy } from './lootPolicy'
import { makeCtx } from './lootPolicy.testHelpers'

describe('resolveLootPolicy minor quest', () => {
  const ctx = makeCtx({
    source: 'quest_complete',
    questScale: 'minor',
    questThreadId: 'qt-1'
  })

  it('only allows misc and potion', () => {
    const policy = resolveLootPolicy(ctx)
    expect(policy.allowedItemTypes).toContain('misc')
    expect(policy.allowedItemTypes).toContain('potion')
    expect(policy.allowedItemTypes).not.toContain('weapon')
  })

  it('caps rarity at common with maxGrantCount 1', () => {
    const policy = resolveLootPolicy(ctx)
    expect(policy.maxRarity).toBe('common')
    expect(policy.maxGrantCount).toBe(1)
  })

  it('is stricter than major quest', () => {
    const major = resolveLootPolicy(
      makeCtx({ source: 'quest_complete', questScale: 'major', questThreadId: 'qt-1' })
    )
    expect(resolveLootPolicy(ctx).maxGrantCount).toBeLessThan(major.maxGrantCount)
  })
})

describe('resolveLootPolicy major quest', () => {
  const ctx = makeCtx({
    source: 'quest_complete',
    questScale: 'major',
    questThreadId: 'qt-1'
  })

  it('allows misc, potion, weapon, armor at rare', () => {
    const policy = resolveLootPolicy(ctx)
    expect(policy.allowedItemTypes).toContain('weapon')
    expect(policy.allowedItemTypes).toContain('armor')
    expect(policy.maxRarity).toBe('rare')
    expect(policy.maxGrantCount).toBe(2)
  })
})
