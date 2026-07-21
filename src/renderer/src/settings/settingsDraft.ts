import type {
  ProviderSettings,
  RedactedProviderSettings,
  SaveProviderSettingsInput
} from '../../../shared/settings/types'

const API_KEY_FIELDS = ['claudeApiKey', 'openaiApiKey', 'geminiApiKey', 'grokApiKey'] as const

function omitBlankApiKeys(draft: ProviderSettings): SaveProviderSettingsInput {
  const {
    claudeApiKey,
    openaiApiKey,
    geminiApiKey,
    grokApiKey,
    ...rest
  } = draft
  return {
    ...rest,
    claudeApiKey: claudeApiKey.trim() === '' ? undefined : claudeApiKey,
    openaiApiKey: openaiApiKey.trim() === '' ? undefined : openaiApiKey,
    geminiApiKey: geminiApiKey.trim() === '' ? undefined : geminiApiKey,
    grokApiKey: grokApiKey.trim() === '' ? undefined : grokApiKey
  }
}

export function toDraftSettings(redacted: RedactedProviderSettings): ProviderSettings {
  const {
    claudeApiKeySet: _claudeApiKeySet,
    openaiApiKeySet: _openaiApiKeySet,
    geminiApiKeySet: _geminiApiKeySet,
    grokApiKeySet: _grokApiKeySet,
    ...rest
  } = redacted
  return {
    ...rest,
    claudeApiKey: '',
    openaiApiKey: '',
    geminiApiKey: '',
    grokApiKey: ''
  }
}

export function buildSaveInput(draft: ProviderSettings): SaveProviderSettingsInput {
  return omitBlankApiKeys(draft)
}

function hasTypedApiKey(draft: ProviderSettings): boolean {
  return API_KEY_FIELDS.some((field) => draft[field].trim() !== '')
}

export function isSettingsDirty(baseline: ProviderSettings, draft: ProviderSettings): boolean {
  if (hasTypedApiKey(draft)) {
    return true
  }
  const baselineComparable = omitBlankApiKeys(baseline)
  const draftComparable = omitBlankApiKeys(draft)
  return JSON.stringify(baselineComparable) !== JSON.stringify(draftComparable)
}
