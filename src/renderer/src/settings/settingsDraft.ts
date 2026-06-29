import type {
  ProviderSettings,
  RedactedProviderSettings,
  SaveProviderSettingsInput
} from '../../../shared/settings/types'

export function toDraftSettings(redacted: RedactedProviderSettings): ProviderSettings {
  const { claudeApiKeySet: _claudeApiKeySet, ...rest } = redacted
  return { ...rest, claudeApiKey: '' }
}

export function buildSaveInput(draft: ProviderSettings): SaveProviderSettingsInput {
  const { claudeApiKey, ...rest } = draft
  return { ...rest, claudeApiKey: claudeApiKey.trim() === '' ? undefined : claudeApiKey }
}

export function isSettingsDirty(baseline: ProviderSettings, draft: ProviderSettings): boolean {
  if (draft.claudeApiKey.trim() !== '') {
    return true
  }
  const { claudeApiKey: _baselineKey, ...baselineRest } = baseline
  const { claudeApiKey: _draftKey, ...draftRest } = draft
  return JSON.stringify(baselineRest) !== JSON.stringify(draftRest)
}
