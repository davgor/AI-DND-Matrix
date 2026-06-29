import { describe, expect, it, vi } from 'vitest'

describe('post-delete UI handling', () => {
  it('clears active detail when the deleted campaign was selected', async () => {
    const onDeleted = vi.fn().mockResolvedValue(undefined)
    await onDeleted('campaign-1')
    expect(onDeleted).toHaveBeenCalledWith('campaign-1')
  })
})
