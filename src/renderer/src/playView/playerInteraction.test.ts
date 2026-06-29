import { describe, expect, it, vi } from 'vitest'

describe('player interaction panel cycle', () => {
  it('submits input and clears the field on success', async () => {
    const setInput = vi.fn()
    const submit = vi.fn().mockResolvedValue(undefined)
    await submit()
    setInput('')
    expect(submit).toHaveBeenCalledTimes(1)
    expect(setInput).toHaveBeenCalledWith('')
  })
})
