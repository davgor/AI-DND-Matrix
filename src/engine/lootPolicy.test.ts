import { describe, expect, it } from 'vitest'
import { resolveLootPolicy } from './lootPolicy'
import { makeCtx, makeFoe } from './lootPolicy.testHelpers'

describe('resolveLootPolicy beast-only encounter', () => {
  const ctx = makeCtx({
    foes: [
      makeFoe({ buckets: ['beast'], outcome: 'slain' }),
      makeFoe({ npcId: 'npc-2', npcRole: 'bear', buckets: ['beast'], outcome: 'incapacitated' })
    ]
  })

  it('only allows misc at common with maxGrantCount 2', () => {
    const policy = resolveLootPolicy(ctx)
    expect(policy.allowedItemTypes).toEqual(['misc'])
    expect(policy.maxRarity).toBe('common')
    expect(policy.maxGrantCount).toBe(2)
    expect(policy.catalogRetrieveFirst).toBe(true)
  })
})

describe('resolveLootPolicy humanoid encounter', () => {
  const ctx = makeCtx({
    foes: [
      makeFoe({ buckets: ['humanoid'], outcome: 'surrender' }),
      makeFoe({ npcId: 'npc-2', npcRole: 'bandit', buckets: ['humanoid'], outcome: 'slain' })
    ]
  })

  it('allows weapons at uncommon with maxGrantCount 3', () => {
    const policy = resolveLootPolicy(ctx)
    expect(policy.allowedItemTypes).toContain('weapon')
    expect(policy.maxRarity).toBe('uncommon')
    expect(policy.maxGrantCount).toBe(3)
  })
})

describe('resolveLootPolicy goblinoid and undead', () => {
  it('allows goblinoid weapons and armor', () => {
    const policy = resolveLootPolicy(makeCtx({ foes: [makeFoe({ buckets: ['goblinoid'] })] }))
    expect(policy.allowedItemTypes).toContain('armor')
    expect(policy.maxRarity).toBe('uncommon')
  })

  it('allows undead misc and potion but not weapon', () => {
    const policy = resolveLootPolicy(makeCtx({ foes: [makeFoe({ buckets: ['undead'] })] }))
    expect(policy.allowedItemTypes).toContain('potion')
    expect(policy.allowedItemTypes).not.toContain('weapon')
  })
})

describe('resolveLootPolicy mixed encounters', () => {
  it('intersects beast and humanoid to misc only at common', () => {
    const policy = resolveLootPolicy(
      makeCtx({
        foes: [
          makeFoe({ buckets: ['beast'], outcome: 'slain' }),
          makeFoe({ npcId: 'npc-2', buckets: ['humanoid'], outcome: 'slain' })
        ]
      })
    )
    expect(policy.allowedItemTypes).toEqual(['misc'])
    expect(policy.maxRarity).toBe('common')
  })

  it('intersects humanoid and undead to misc and potion', () => {
    const policy = resolveLootPolicy(
      makeCtx({
        foes: [
          makeFoe({ buckets: ['humanoid'], outcome: 'slain' }),
          makeFoe({ npcId: 'npc-2', buckets: ['undead'], outcome: 'incapacitated' })
        ]
      })
    )
    expect(policy.allowedItemTypes).toContain('potion')
    expect(policy.allowedItemTypes).not.toContain('weapon')
    expect(policy.maxRarity).toBe('uncommon')
  })
})

describe('resolveLootPolicy empty encounter', () => {
  it('maxGrantCount is 0 when foes fled or absent', () => {
    expect(resolveLootPolicy(makeCtx({ foes: [] })).maxGrantCount).toBe(0)
    expect(
      resolveLootPolicy(
        makeCtx({ foes: [makeFoe({ outcome: 'flee' }), makeFoe({ npcId: 'npc-2', outcome: 'flee' })] })
      ).maxGrantCount
    ).toBe(0)
  })

  it('counts only lootable humanoid foes after flee', () => {
    const policy = resolveLootPolicy(
      makeCtx({
        foes: [
          makeFoe({ outcome: 'flee' }),
          makeFoe({ npcId: 'npc-2', buckets: ['humanoid'], outcome: 'slain' })
        ]
      })
    )
    expect(policy.maxGrantCount).toBeGreaterThan(0)
    expect(policy.allowedItemTypes).toContain('weapon')
  })
})
