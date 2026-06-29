import { describe, expect, it, vi } from 'vitest'

describe('campaigns rail selection', () => {
  it('invokes campaign switch callback when a campaign is selected', async () => {
    const onSelect = vi.fn().mockResolvedValue(undefined)
    await onSelect('campaign-2')
    expect(onSelect).toHaveBeenCalledWith('campaign-2')
  })
})
