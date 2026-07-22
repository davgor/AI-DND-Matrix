import { describe, expect, it, vi, beforeEach } from 'vitest'
import { failureMessageForTest, runExportAction, runImportAction } from './campaignPortabilityActions'

describe('campaign portability sidebar actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('export success clears error and does not require list refresh', async () => {
    const exportFn = vi.fn().mockResolvedValue({ ok: true, campaignId: 'c1', path: '/tmp/a.aittrpg' })
    const refresh = vi.fn()
    const result = await runExportAction(exportFn, refresh, 'c1')
    expect(exportFn).toHaveBeenCalledWith('c1')
    expect(refresh).not.toHaveBeenCalled()
    expect(result.error).toBeNull()
  })

  it('import success refreshes the campaign list', async () => {
    const importFn = vi.fn().mockResolvedValue({ ok: true, campaignId: 'new-id' })
    const refresh = vi.fn().mockResolvedValue(undefined)
    const result = await runImportAction(importFn, refresh)
    expect(importFn).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
    expect(result.error).toBeNull()
  })

  it('canceled dialogs are not treated as errors', () => {
    expect(failureMessageForTest({ ok: false, canceled: true })).toBeNull()
    expect(failureMessageForTest({ ok: false, message: 'Nope' })).toBe('Nope')
  })
})
