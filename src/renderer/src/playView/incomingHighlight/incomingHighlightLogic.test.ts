import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INCOMING_HIGHLIGHT_CLASS,
  INCOMING_HIGHLIGHT_DURATION_MS,
  HighlightTimer,
  IdHighlightTracker,
  filterEligibleNewIds,
  incomingHighlightClassName,
  observeIncomingIds,
  observeIncomingValue
} from './incomingHighlightLogic'

describe('incoming highlight constants', () => {
  it('exposes a shared duration (~2–3s) and CSS class name', () => {
    expect(INCOMING_HIGHLIGHT_DURATION_MS).toBeGreaterThanOrEqual(2000)
    expect(INCOMING_HIGHLIGHT_DURATION_MS).toBeLessThanOrEqual(3000)
    expect(INCOMING_HIGHLIGHT_CLASS).toBe('incoming-highlight')
  })
})

describe('observeIncomingValue', () => {
  it('does not highlight on first paint with an initial value', () => {
    const result = observeIncomingValue({ seen: false, previous: '' }, 'Quiet hall')
    expect(result.shouldStartHighlight).toBe(false)
    expect(result.next).toEqual({ seen: true, previous: 'Quiet hall' })
  })

  it('highlights when the watched value changes after mount', () => {
    const mounted = observeIncomingValue({ seen: false, previous: '' }, 'Quiet hall')
    const changed = observeIncomingValue(mounted.next, 'Torches gutter')
    expect(changed.shouldStartHighlight).toBe(true)
    expect(changed.next.previous).toBe('Torches gutter')
  })

  it('does not highlight when the value is unchanged', () => {
    const mounted = observeIncomingValue({ seen: false, previous: '' }, 'Quiet hall')
    const same = observeIncomingValue(mounted.next, 'Quiet hall')
    expect(same.shouldStartHighlight).toBe(false)
  })
})

describe('observeIncomingIds', () => {
  it('seeds known ids on first observation without reporting newcomers', () => {
    const result = observeIncomingIds(new Set(), ['a', 'b'], false)
    expect(result.newIds).toEqual([])
    expect([...result.nextKnown]).toEqual(['a', 'b'])
    expect(result.seeded).toBe(true)
  })

  it('reports only newly appeared ids after seed', () => {
    const seeded = observeIncomingIds(new Set(), ['a', 'b'], false)
    const next = observeIncomingIds(seeded.nextKnown, ['a', 'b', 'c'], true)
    expect(next.newIds).toEqual(['c'])
  })
})

describe('filterEligibleNewIds', () => {
  it('keeps only newcomers that are eligible to glow', () => {
    expect(filterEligibleNewIds(['a', 'b', 'c'], new Set(['b', 'c']))).toEqual(['b', 'c'])
    expect(filterEligibleNewIds(['a'], new Set(['b']))).toEqual([])
  })
})

describe('incomingHighlightClassName', () => {
  it('appends the shared class when active', () => {
    expect(incomingHighlightClassName(false, 'dm-exposition-scene')).toBe('dm-exposition-scene')
    expect(incomingHighlightClassName(true, 'dm-exposition-scene')).toBe(
      `dm-exposition-scene ${INCOMING_HIGHLIGHT_CLASS}`
    )
    expect(incomingHighlightClassName(true)).toBe(INCOMING_HIGHLIGHT_CLASS)
  })
})

describe('HighlightTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('activates on restart and clears after the shared duration', () => {
    const setActive = vi.fn()
    const timer = new HighlightTimer(INCOMING_HIGHLIGHT_DURATION_MS, setActive)
    timer.restart()
    expect(setActive).toHaveBeenCalledWith(true)
    vi.advanceTimersByTime(INCOMING_HIGHLIGHT_DURATION_MS - 1)
    expect(setActive).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(setActive).toHaveBeenLastCalledWith(false)
    timer.dispose()
  })

  it('restarts the duration on rapid successive changes', () => {
    const setActive = vi.fn()
    const timer = new HighlightTimer(INCOMING_HIGHLIGHT_DURATION_MS, setActive)
    timer.restart()
    vi.advanceTimersByTime(INCOMING_HIGHLIGHT_DURATION_MS / 2)
    timer.restart()
    vi.advanceTimersByTime(INCOMING_HIGHLIGHT_DURATION_MS / 2)
    expect(setActive).not.toHaveBeenCalledWith(false)
    vi.advanceTimersByTime(INCOMING_HIGHLIGHT_DURATION_MS / 2)
    expect(setActive).toHaveBeenLastCalledWith(false)
    timer.dispose()
  })
})

describe('IdHighlightTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('activates new ids and clears each after the shared duration', () => {
    const onChange = vi.fn()
    const tracker = new IdHighlightTracker(INCOMING_HIGHLIGHT_DURATION_MS, onChange)
    tracker.activate(['n1', 'n2'])
    expect(onChange).toHaveBeenCalledWith(new Set(['n1', 'n2']))
    vi.advanceTimersByTime(INCOMING_HIGHLIGHT_DURATION_MS)
    expect(onChange).toHaveBeenLastCalledWith(new Set())
    tracker.dispose()
  })

  it('restarts an id timer without leaving stale glow forever', () => {
    const onChange = vi.fn()
    const tracker = new IdHighlightTracker(INCOMING_HIGHLIGHT_DURATION_MS, onChange)
    tracker.activate(['n1'])
    vi.advanceTimersByTime(INCOMING_HIGHLIGHT_DURATION_MS / 2)
    tracker.activate(['n1'])
    vi.advanceTimersByTime(INCOMING_HIGHLIGHT_DURATION_MS / 2)
    expect([...((onChange.mock.calls.at(-1)?.[0] as Set<string>) ?? [])]).toEqual(['n1'])
    vi.advanceTimersByTime(INCOMING_HIGHLIGHT_DURATION_MS / 2)
    expect(onChange).toHaveBeenLastCalledWith(new Set())
    tracker.dispose()
  })
})
