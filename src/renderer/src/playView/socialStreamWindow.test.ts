import { describe, expect, it } from 'vitest'
import {
  SOCIAL_WINDOW_CHUNK,
  SOCIAL_WINDOW_SIZE,
  initialSocialWindow,
  isNearSocialBottom,
  loadOlderSocialWindow,
  newestSocialWindow,
  scrollTopAfterPrepend,
  shouldLoadOlderSocial,
  sliceSocialWindow
} from './socialStreamWindow'

describe('initialSocialWindow / newestSocialWindow', () => {
  it('anchors on the newest SOCIAL_WINDOW_SIZE entries', () => {
    expect(initialSocialWindow(250)).toEqual({
      start: 250 - SOCIAL_WINDOW_SIZE,
      count: SOCIAL_WINDOW_SIZE
    })
    expect(newestSocialWindow(250)).toEqual(initialSocialWindow(250))
  })

  it('fits short lists', () => {
    expect(initialSocialWindow(12)).toEqual({ start: 0, count: 12 })
    expect(initialSocialWindow(0)).toEqual({ start: 0, count: 0 })
  })
})

describe('loadOlderSocialWindow', () => {
  it('shifts toward older history by chunk while keeping a 100-message render cap', () => {
    const current = initialSocialWindow(250)
    const older = loadOlderSocialWindow(current, 250)
    expect(older).toEqual({
      start: current.start - SOCIAL_WINDOW_CHUNK,
      count: SOCIAL_WINDOW_SIZE
    })
    expect(sliceSocialWindow(Array.from({ length: 250 }, (_, i) => i), older)).toHaveLength(
      SOCIAL_WINDOW_SIZE
    )
  })

  it('clamps at the start of history', () => {
    expect(loadOlderSocialWindow({ start: 40, count: SOCIAL_WINDOW_SIZE }, 250)).toEqual({
      start: 0,
      count: SOCIAL_WINDOW_SIZE
    })
  })
})

describe('sliceSocialWindow', () => {
  it('returns only the windowed slice', () => {
    const entries = Array.from({ length: 150 }, (_, index) => `m${index}`)
    expect(sliceSocialWindow(entries, { start: 50, count: 100 })).toEqual(entries.slice(50, 150))
  })
})

describe('scroll helpers', () => {
  it('detects top load trigger and bottom pin', () => {
    expect(shouldLoadOlderSocial(0)).toBe(true)
    expect(shouldLoadOlderSocial(49)).toBe(false)
    expect(isNearSocialBottom(900, 1000, 80)).toBe(true)
    expect(isNearSocialBottom(0, 1000, 80)).toBe(false)
  })

  it('preserves viewport offset after older messages are prepended', () => {
    expect(scrollTopAfterPrepend(1000, 40, 1600)).toBe(640)
  })
})
