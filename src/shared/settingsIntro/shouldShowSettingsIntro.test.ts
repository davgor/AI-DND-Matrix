import { describe, expect, it } from 'vitest'
import { shouldShowSettingsIntro } from './shouldShowSettingsIntro'

describe('shouldShowSettingsIntro', () => {
  it('shows when the player has not dismissed the intro', () => {
    expect(shouldShowSettingsIntro(false, false)).toBe(true)
  })

  it('hides after the player dismisses the intro', () => {
    expect(shouldShowSettingsIntro(true, false)).toBe(false)
  })

  it('always shows when dev force-show is enabled', () => {
    expect(shouldShowSettingsIntro(true, true)).toBe(true)
    expect(shouldShowSettingsIntro(false, true)).toBe(true)
  })
})
