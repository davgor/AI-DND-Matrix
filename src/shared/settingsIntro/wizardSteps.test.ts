import { describe, expect, it } from 'vitest'
import { nextSettingsIntroStepAfterLocalChoice } from './wizardSteps'

describe('nextSettingsIntroStepAfterLocalChoice', () => {
  it('routes Yes to GPU/CPU selection', () => {
    expect(nextSettingsIntroStepAfterLocalChoice(true)).toBe('askBackend')
  })

  it('routes No to the provider fallback intro', () => {
    expect(nextSettingsIntroStepAfterLocalChoice(false)).toBe('providerFallback')
  })
})
