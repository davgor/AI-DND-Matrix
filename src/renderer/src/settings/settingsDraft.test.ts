import { describe, expect, it } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../../../shared/settings/types'
import { redactProviderSettings } from '../../../shared/settings/validation'
import { buildSaveInput, isSettingsDirty, toDraftSettings } from './settingsDraft'

describe('toDraftSettings', () => {
  it('starts all draft API keys blank even when keys are stored server-side', () => {
    const redacted = redactProviderSettings({
      ...DEFAULT_PROVIDER_SETTINGS,
      claudeApiKey: 'sk-ant-secret',
      openaiApiKey: 'sk-openai'
    })
    const draft = toDraftSettings(redacted)

    expect(draft.claudeApiKey).toBe('')
    expect(draft.openaiApiKey).toBe('')
    expect(draft.geminiApiKey).toBe('')
    expect(draft.grokApiKey).toBe('')
    expect(draft.mode).toBe(redacted.mode)
  })
})

describe('buildSaveInput', () => {
  it('omits API keys from the save payload when draft fields were left blank', () => {
    const draft = { ...DEFAULT_PROVIDER_SETTINGS, claudeApiKey: '', openaiApiKey: '' }
    const input = buildSaveInput(draft)
    expect(input.claudeApiKey).toBeUndefined()
    expect(input.openaiApiKey).toBeUndefined()
  })

  it('includes typed API keys in the save payload', () => {
    const draft = {
      ...DEFAULT_PROVIDER_SETTINGS,
      claudeApiKey: 'sk-ant-new',
      openaiApiKey: 'sk-openai-new'
    }
    const input = buildSaveInput(draft)
    expect(input.claudeApiKey).toBe('sk-ant-new')
    expect(input.openaiApiKey).toBe('sk-openai-new')
  })
})

describe('isSettingsDirty', () => {
  const baseline = DEFAULT_PROVIDER_SETTINGS

  it('is false when the draft matches the baseline and API key fields are blank', () => {
    expect(isSettingsDirty(baseline, { ...baseline, claudeApiKey: '' })).toBe(false)
  })

  it('is true when a non-secret field differs from the baseline', () => {
    expect(isSettingsDirty(baseline, { ...baseline, mode: 'claude', claudeApiKey: '' })).toBe(true)
  })

  it('is true when the user has typed anything into an API key field', () => {
    expect(isSettingsDirty(baseline, { ...baseline, openaiApiKey: 'sk-typed' })).toBe(true)
  })

  it('retains other provider fields when only mode changes (dirty via mode)', () => {
    const draft = {
      ...baseline,
      mode: 'openai' as const,
      openaiModel: 'gpt-4.1-mini',
      claudeApiKey: ''
    }
    expect(isSettingsDirty(baseline, draft)).toBe(true)
    expect(draft.openaiModel).toBe('gpt-4.1-mini')
    expect(draft.player2BaseUrl).toBe(baseline.player2BaseUrl)
  })
})
