import { describe, expect, it } from 'vitest'
import { resolveStandardDeath, type SaveSnapshot } from './deathStandard'

describe('resolveStandardDeath', () => {
  it('restores the most recent snapshot taken before the fatal action', () => {
    const snapshots: SaveSnapshot[] = [
      { id: 'earlier', createdAt: 1, state: { hp: 10 } },
      { id: 'pre-fatal', createdAt: 2, state: { hp: 8 } }
    ]

    const restored = resolveStandardDeath(snapshots)

    expect(restored.id).toBe('pre-fatal')
    expect(restored).not.toBe(snapshots[0])
  })

  it('throws when there is no snapshot to restore', () => {
    expect(() => resolveStandardDeath([])).toThrow()
  })
})
