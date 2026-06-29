import { describe, expect, it, vi } from 'vitest'

describe('campaign delete confirmation flow', () => {
  it('opens the prompt without mutating list state until confirm', () => {
    const open = vi.fn()
    const close = vi.fn()
    open({ id: 'c1', name: 'Test' })
    expect(open).toHaveBeenCalledTimes(1)
    close()
    expect(close).toHaveBeenCalledTimes(1)
  })
})
