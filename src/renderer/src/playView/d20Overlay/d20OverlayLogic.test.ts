import { describe, expect, it } from 'vitest'
import {
  D20_OVERLAY_EXIT_MS,
  D20_OVERLAY_REDUCED_MOTION_MS,
  D20_OVERLAY_SETTLE_MS,
  D20_OVERLAY_TRAVEL_MS,
  D20_SHOW_ROLLS_OFF_FACE_POLICY,
  checkIdentityKey,
  clampD20Face,
  observeLiveCheck,
  shouldPersistSettledFaceLabel,
  totalOverlayDurationMs,
  type CheckSnapshot
} from './d20OverlayLogic'

const sample: NonNullable<CheckSnapshot> = {
  roll: 17,
  total: 19,
  dc: 15,
  success: true
}

describe('d20 overlay timing constants', () => {
  it('keeps travel, settle, and exit durations in one tunable place', () => {
    expect(D20_OVERLAY_TRAVEL_MS).toBeGreaterThanOrEqual(800)
    expect(D20_OVERLAY_TRAVEL_MS).toBeLessThanOrEqual(2000)
    expect(D20_OVERLAY_SETTLE_MS).toBeGreaterThanOrEqual(500)
    expect(D20_OVERLAY_EXIT_MS).toBeGreaterThanOrEqual(200)
    expect(totalOverlayDurationMs()).toBe(
      D20_OVERLAY_TRAVEL_MS + D20_OVERLAY_SETTLE_MS + D20_OVERLAY_EXIT_MS
    )
    expect(D20_OVERLAY_REDUCED_MOTION_MS).toBeLessThan(totalOverlayDurationMs())
  })
})

describe('checkIdentityKey', () => {
  it('returns null for missing checks and a stable key for live checks', () => {
    expect(checkIdentityKey(null)).toBeNull()
    expect(checkIdentityKey(sample)).toBe('17|19|15|true')
  })
})

describe('clampD20Face', () => {
  it('clamps to 1–20', () => {
    expect(clampD20Face(0)).toBe(1)
    expect(clampD20Face(21)).toBe(20)
    expect(clampD20Face(7.9)).toBe(8)
    expect(clampD20Face(Number.NaN)).toBe(1)
  })
})

describe('observeLiveCheck', () => {
  it('does not animate on first paint with an existing check', () => {
    const result = observeLiveCheck({ seen: false, previousKey: null }, sample)
    expect(result.shouldAnimate).toBe(false)
    expect(result.face).toBeNull()
    expect(result.next.seen).toBe(true)
    expect(result.next.previousKey).toBe('17|19|15|true')
  })

  it('animates when a new check arrives after mount', () => {
    const mounted = observeLiveCheck({ seen: false, previousKey: null }, null)
    const next = observeLiveCheck(mounted.next, sample)
    expect(next.shouldAnimate).toBe(true)
    expect(next.face).toBe(17)
  })

  it('does not animate when the check identity is unchanged', () => {
    const mounted = observeLiveCheck({ seen: false, previousKey: null }, null)
    const first = observeLiveCheck(mounted.next, sample)
    const same = observeLiveCheck(first.next, sample)
    expect(same.shouldAnimate).toBe(false)
  })

  it('does not animate when check clears to null', () => {
    const mounted = observeLiveCheck({ seen: false, previousKey: null }, sample)
    const cleared = observeLiveCheck(mounted.next, null)
    expect(cleared.shouldAnimate).toBe(false)
    expect(cleared.face).toBeNull()
  })

  it('animates again when a different check replaces the previous one', () => {
    const mounted = observeLiveCheck({ seen: false, previousKey: null }, null)
    const first = observeLiveCheck(mounted.next, sample)
    const second = observeLiveCheck(first.next, { ...sample, roll: 3, total: 5, success: false })
    expect(second.shouldAnimate).toBe(true)
    expect(second.face).toBe(3)
  })
})

describe('show-rolls face policy', () => {
  it('locks brief-then-clear when Show rolls is off', () => {
    expect(D20_SHOW_ROLLS_OFF_FACE_POLICY).toBe('brief-then-clear')
    expect(shouldPersistSettledFaceLabel(true)).toBe(true)
    expect(shouldPersistSettledFaceLabel(false)).toBe(false)
  })
})
