import { describe, expect, it } from 'vitest'
import {
  guardSceneUpdateForDestroyedRegion,
  regionRequiresDestroyedGuard,
  WORLD_MUTATION_DIGEST_MAX_CHARS,
  buildWorldMutationDigest
} from './index'

describe('world mutation guards', () => {
  it('flags destroyed regions for pristine-assumption guard', () => {
    expect(regionRequiresDestroyedGuard({ destroyed: true })).toBe(true)
    expect(regionRequiresDestroyedGuard({ destroyed: false, damaged: true })).toBe(false)
  })

  it('drops sceneUpdate on destroyed region without restore proposal', () => {
    const status = { destroyed: true, cause: 'fire' }
    expect(
      guardSceneUpdateForDestroyedRegion(status, 'The village square bustles with merchants.', [
        { regionId: 'r1', op: 'damage' }
      ])
    ).toBeUndefined()
    expect(
      guardSceneUpdateForDestroyedRegion(status, 'Ash and timber frame a rebuilding hall.', [
        { regionId: 'r1', op: 'restore' }
      ])
    ).toBe('Ash and timber frame a rebuilding hall.')
  })
})

describe('buildWorldMutationDigest', () => {
  it('includes destroyed grounding and stays within budget', () => {
    const digest = buildWorldMutationDigest({
      regionName: 'Oakhollow',
      regionStatus: { destroyed: true, cause: 'dragonfire' },
      presentNpcs: [
        { name: 'Mira', alive: false },
        { name: 'Tobin', alive: true }
      ]
    })
    expect(digest).toBeDefined()
    expect(digest!).toContain('DESTROYED')
    expect(digest!).toContain('restore')
    expect(digest!).toContain('Mira')
    expect(digest!.length).toBeLessThanOrEqual(WORLD_MUTATION_DIGEST_MAX_CHARS)
  })

  it('returns undefined when region is pristine and NPCs alive', () => {
    expect(
      buildWorldMutationDigest({
        regionName: 'Oakhollow',
        regionStatus: { destroyed: false },
        presentNpcs: [{ name: 'Mira', alive: true }]
      })
    ).toBeUndefined()
  })
})
