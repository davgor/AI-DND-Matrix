import { describe, expect, it, vi } from 'vitest'
import type { ManualUpdateCheckResult } from '../../../shared/autoUpdate/types'
import { requestCheckForUpdates } from './checkForUpdates'

describe('requestCheckForUpdates', () => {
  it('returns the preload checkForUpdates result', async () => {
    const expected: ManualUpdateCheckResult = { outcome: 'up-to-date' }
    const checkForUpdates = vi.fn().mockResolvedValue(expected)
    await expect(requestCheckForUpdates(checkForUpdates)).resolves.toEqual(expected)
    expect(checkForUpdates).toHaveBeenCalledTimes(1)
  })
})
