import { describe, expect, it, vi } from 'vitest'
import { handleComposerKeyDown } from './PlayerActionPanel'

describe('handleComposerKeyDown', () => {
  it('submits on Enter and keeps Shift+Enter as newline', () => {
    const onSubmit = vi.fn()
    const preventDefault = vi.fn()
    handleComposerKeyDown(
      { key: 'Enter', shiftKey: false, preventDefault },
      { disabled: false, inputValue: 'I look around', onSubmit }
    )
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledOnce()

    onSubmit.mockClear()
    handleComposerKeyDown(
      { key: 'Enter', shiftKey: true, preventDefault: vi.fn() },
      { disabled: false, inputValue: 'line', onSubmit }
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit when disabled or input is blank', () => {
    const onSubmit = vi.fn()
    handleComposerKeyDown(
      { key: 'Enter', shiftKey: false, preventDefault: vi.fn() },
      { disabled: true, inputValue: 'hello', onSubmit }
    )
    handleComposerKeyDown(
      { key: 'Enter', shiftKey: false, preventDefault: vi.fn() },
      { disabled: false, inputValue: '   ', onSubmit }
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
