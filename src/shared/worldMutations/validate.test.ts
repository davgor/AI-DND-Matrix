import { describe, expect, it } from 'vitest'
import {
  applyRegionMutationOp,
  parseNpcLifeUpdate,
  parseRegionStatusUpdate,
  WORLD_MUTATION_CAUSE_MAX_CHARS
} from './index'

describe('parseRegionStatusUpdate', () => {
  it('accepts destroy/damage/restore and clamps cause', () => {
    expect(parseRegionStatusUpdate({ regionId: 'r1', op: 'destroy', cause: 'fire' })).toEqual({
      regionId: 'r1',
      op: 'destroy',
      cause: 'fire'
    })
    expect(parseRegionStatusUpdate({ regionId: 'r1', op: 'damage' })?.op).toBe('damage')
    expect(parseRegionStatusUpdate({ regionId: 'r1', op: 'restore' })?.op).toBe('restore')
    const long = 'x'.repeat(WORLD_MUTATION_CAUSE_MAX_CHARS + 40)
    expect(parseRegionStatusUpdate({ regionId: 'r1', op: 'destroy', cause: long })?.cause).toHaveLength(
      WORLD_MUTATION_CAUSE_MAX_CHARS
    )
  })

  it('rejects missing regionId or unknown op', () => {
    expect(parseRegionStatusUpdate({ op: 'destroy' })).toBeNull()
    expect(parseRegionStatusUpdate({ regionId: 'r1', op: 'explode' })).toBeNull()
    expect(parseRegionStatusUpdate(null)).toBeNull()
  })
})

describe('parseNpcLifeUpdate', () => {
  it('requires npcId and boolean alive', () => {
    expect(parseNpcLifeUpdate({ npcId: 'n1', alive: false })).toEqual({
      npcId: 'n1',
      alive: false
    })
    expect(parseNpcLifeUpdate({ npcId: 'n1', alive: true, location: 'crypt' })).toEqual({
      npcId: 'n1',
      alive: true,
      location: 'crypt'
    })
    expect(parseNpcLifeUpdate({ npcId: 'n1' })).toBeNull()
    expect(parseNpcLifeUpdate({ alive: false })).toBeNull()
  })
})

describe('applyRegionMutationOp', () => {
  it('destroy sets destroyed; restore clears; damage does not revive', () => {
    const destroyed = applyRegionMutationOp({ destroyed: false }, 'destroy', 'siege')
    expect(destroyed).toEqual({ destroyed: true, damaged: false, cause: 'siege' })

    const damaged = applyRegionMutationOp({ destroyed: false }, 'damage', 'quake')
    expect(damaged).toEqual({ destroyed: false, damaged: true, cause: 'quake' })

    const stillGone = applyRegionMutationOp(
      { destroyed: true, cause: 'siege' },
      'damage',
      'more rubble'
    )
    expect(stillGone.destroyed).toBe(true)
    expect(stillGone.cause).toBe('more rubble')

    expect(applyRegionMutationOp({ destroyed: true, cause: 'siege' }, 'restore')).toEqual({
      destroyed: false,
      damaged: false
    })
  })
})
