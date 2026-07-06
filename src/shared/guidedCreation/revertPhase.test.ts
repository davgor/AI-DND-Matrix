import { describe, expect, it } from 'vitest'
import { canRevertGuidedCreationPhase } from './revertPhase'

describe('canRevertGuidedCreationPhase', () => {
  it('allows reverting from equipment to background or race', () => {
    expect(canRevertGuidedCreationPhase('equipment', 'background')).toBe(true)
    expect(canRevertGuidedCreationPhase('equipment', 'race')).toBe(true)
  })

  it('allows reverting from background to race', () => {
    expect(canRevertGuidedCreationPhase('background', 'race')).toBe(true)
  })

  it('rejects forward or same-phase targets', () => {
    expect(canRevertGuidedCreationPhase('race', 'background')).toBe(false)
    expect(canRevertGuidedCreationPhase('background', 'background')).toBe(false)
    expect(canRevertGuidedCreationPhase('race', 'race')).toBe(false)
  })

  it('rejects reverting from identity or complete', () => {
    expect(canRevertGuidedCreationPhase('identity', 'equipment')).toBe(false)
    expect(canRevertGuidedCreationPhase('complete', 'race')).toBe(false)
  })
})
