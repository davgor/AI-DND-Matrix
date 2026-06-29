import { describe, expect, it } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../../../shared/settings/types'
import { redactProviderSettings } from '../../../shared/settings/validation'
import { buildSaveInput, isSettingsDirty, toDraftSettings } from './settingsDraft'

describe('toDraftSettings', () => {
  it('starts the draft API key blank even when one is stored server-side', () => {
    const redacted = redactProviderSettings({ ...DEFAULT_PROVIDER_SETTINGS, claudeApiKey: 'sk-ant-secret' })
    const draft = toDraftSettings(redacted)

    expect(draft.claudeApiKey).toBe('')
    expect(draft.mode).toBe(redacted.mode)
  })
})

describe('buildSaveInput', () => {
  it('omits claudeApiKey from the save payload when the draft field was left blank', () => {
    const draft = { ...DEFAULT_PROVIDER_SETTINGS, claudeApiKey: '' }
    const input = buildSaveInput(draft)
    expect(input.claudeApiKey).toBeUndefined()
  })

  it('includes claudeApiKey in the save payload when the user typed a new value', () => {
    const draft = { ...DEFAULT_PROVIDER_SETTINGS, claudeApiKey: 'sk-ant-new' }
    const input = buildSaveInput(draft)
    expect(input.claudeApiKey).toBe('sk-ant-new')
  })
})

describe('isSettingsDirty', () => {
  const baseline = DEFAULT_PROVIDER_SETTINGS

  it('is false when the draft matches the baseline and the API key field is blank', () => {
    expect(isSettingsDirty(baseline, { ...baseline, claudeApiKey: '' })).toBe(false)
  })

  it('is true when a non-secret field differs from the baseline', () => {
    expect(isSettingsDirty(baseline, { ...baseline, mode: 'player2', claudeApiKey: '' })).toBe(true)
  })

  it('is true when the user has typed anything into the API key field', () => {
    expect(isSettingsDirty(baseline, { ...baseline, claudeApiKey: 'sk-ant-typed' })).toBe(true)
  })
})
