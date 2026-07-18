import { describe, expect, it } from 'vitest'
import { resolveOpeningSceneForReady } from './resolveOpeningSceneForReady'

describe('resolveOpeningSceneForReady', () => {
  it('prefers a non-empty proposed scene', () => {
    expect(resolveOpeningSceneForReady('  Proposed scene.  ', 'Persisted scene.')).toBe('Proposed scene.')
  })

  it('falls back to the persisted scene when proposed is null or blank', () => {
    expect(resolveOpeningSceneForReady(null, 'Persisted scene.')).toBe('Persisted scene.')
    expect(resolveOpeningSceneForReady('   ', 'Persisted scene.')).toBe('Persisted scene.')
  })

  it('returns null when neither scene has text', () => {
    expect(resolveOpeningSceneForReady(null, null)).toBeNull()
    expect(resolveOpeningSceneForReady('', '  ')).toBeNull()
  })
})
