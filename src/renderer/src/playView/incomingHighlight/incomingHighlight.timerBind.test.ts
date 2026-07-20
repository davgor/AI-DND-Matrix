import { describe, expect, it, vi } from 'vitest'
import { HighlightTimer, IdHighlightTracker } from './incomingHighlightLogic'

/**
 * Electron/Chromium throws TypeError: Illegal invocation when setTimeout/clearTimeout
 * are stored and called as bare function references (lost `window` receiver).
 * Defaults must go through globalThis so play-view mount does not blank #root.
 */
describe('HighlightTimer default timers (electron Illegal invocation)', () => {
  it('restart and dispose use bound global timers without throwing', () => {
    vi.useFakeTimers()
    const setActive = vi.fn()
    const timer = new HighlightTimer(100, setActive)
    expect(() => timer.restart()).not.toThrow()
    expect(setActive).toHaveBeenCalledWith(true)
    expect(() => timer.dispose()).not.toThrow()
    vi.useRealTimers()
  })
})

describe('IdHighlightTracker default timers (electron Illegal invocation)', () => {
  it('activate and dispose use bound global timers without throwing', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const tracker = new IdHighlightTracker(100, onChange)
    expect(() => tracker.activate(['a'])).not.toThrow()
    expect(onChange).toHaveBeenCalled()
    expect(() => tracker.dispose()).not.toThrow()
    vi.useRealTimers()
  })
})
