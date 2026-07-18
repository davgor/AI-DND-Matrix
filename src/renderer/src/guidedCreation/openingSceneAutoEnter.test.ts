import { describe, expect, it } from 'vitest'
import { shouldAutoEnterWorld } from './openingSceneAutoEnter'

describe('shouldAutoEnterWorld', () => {
  it('is true once opening-scene phase is complete', () => {
    expect(shouldAutoEnterWorld('complete')).toBe(true)
  })

  it('is false while still negotiating the opening scene', () => {
    expect(shouldAutoEnterWorld('opening_scene')).toBe(false)
    expect(shouldAutoEnterWorld('identity')).toBe(false)
  })
})
