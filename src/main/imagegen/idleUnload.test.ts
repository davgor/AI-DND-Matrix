import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_IMAGE_IDLE_UNLOAD_MS, createImageIdleUnloadController } from './idleUnload'

describe('createImageIdleUnloadController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses 120s default idle unload', () => {
    expect(DEFAULT_IMAGE_IDLE_UNLOAD_MS).toBe(120_000)
  })

  it('does not unload while a job is in flight', () => {
    const onIdleUnload = vi.fn()
    const controller = createImageIdleUnloadController(onIdleUnload, 1_000)
    controller.jobStarted()
    vi.advanceTimersByTime(5_000)
    expect(onIdleUnload).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('schedules unload after the last job finishes', () => {
    const onIdleUnload = vi.fn()
    const controller = createImageIdleUnloadController(onIdleUnload, 1_000)
    controller.jobStarted()
    controller.jobFinished()
    vi.advanceTimersByTime(999)
    expect(onIdleUnload).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onIdleUnload).toHaveBeenCalledTimes(1)
    controller.dispose()
  })

  it('resets idle timer when a new job starts before expiry', () => {
    const onIdleUnload = vi.fn()
    const controller = createImageIdleUnloadController(onIdleUnload, 1_000)
    controller.jobStarted()
    controller.jobFinished()
    vi.advanceTimersByTime(900)
    controller.jobStarted()
    vi.advanceTimersByTime(500)
    expect(onIdleUnload).not.toHaveBeenCalled()
    controller.jobFinished()
    vi.advanceTimersByTime(1_000)
    expect(onIdleUnload).toHaveBeenCalledTimes(1)
    controller.dispose()
  })
})
