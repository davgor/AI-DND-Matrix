import type {
  ProviderSettings,
  ProviderValidationContext,
  RedactedProviderSettings,
  SettingsValidationError
} from './types'

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function requireApiKey(
  key: string,
  field: string,
  label: string,
  keySet: boolean | undefined
): SettingsValidationError[] {
  if (key.trim() || keySet) {
    return []
  }
  return [{ field, message: `${label} API key is required.` }]
}

function requireModel(model: string, field: string, label: string): SettingsValidationError[] {
  if (model.trim()) {
    return []
  }
  return [{ field, message: `${label} model is required.` }]
}

function validateClaude(
  settings: ProviderSettings,
  context?: ProviderValidationContext
): SettingsValidationError[] {
  return [
    ...requireApiKey(settings.claudeApiKey, 'claudeApiKey', 'Claude', context?.claudeApiKeySet),
    ...requireModel(settings.claudeModel, 'claudeModel', 'Claude')
  ]
}

function validateOpenAi(
  settings: ProviderSettings,
  context?: ProviderValidationContext
): SettingsValidationError[] {
  return [
    ...requireApiKey(settings.openaiApiKey, 'openaiApiKey', 'OpenAI', context?.openaiApiKeySet),
    ...requireModel(settings.openaiModel, 'openaiModel', 'OpenAI')
  ]
}

function validateGemini(
  settings: ProviderSettings,
  context?: ProviderValidationContext
): SettingsValidationError[] {
  return [
    ...requireApiKey(settings.geminiApiKey, 'geminiApiKey', 'Gemini', context?.geminiApiKeySet),
    ...requireModel(settings.geminiModel, 'geminiModel', 'Gemini')
  ]
}

function validateGrok(
  settings: ProviderSettings,
  context?: ProviderValidationContext
): SettingsValidationError[] {
  return [
    ...requireApiKey(settings.grokApiKey, 'grokApiKey', 'Grok', context?.grokApiKeySet),
    ...requireModel(settings.grokModel, 'grokModel', 'Grok')
  ]
}

function validatePlayer2(settings: ProviderSettings): SettingsValidationError[] {
  if (!isValidUrl(settings.player2BaseUrl)) {
    return [{ field: 'player2BaseUrl', message: 'Enter a valid URL, e.g. http://127.0.0.1:4315.' }]
  }
  return []
}

function validateLlamaCppManagedPaths(settings: ProviderSettings): SettingsValidationError[] {
  if (settings.llamaCppStartMode !== 'managed') {
    return []
  }
  const errors: SettingsValidationError[] = []
  if (!settings.llamaCppServerPath.trim()) {
    errors.push({
      field: 'llamaCppServerPath',
      message: 'Managed mode requires a path to the llama-server executable.'
    })
  }
  if (!settings.llamaCppModelPath.trim()) {
    errors.push({ field: 'llamaCppModelPath', message: 'Managed mode requires a path to a .gguf model file.' })
  }
  return errors
}

function validateLlamaCpp(settings: ProviderSettings): SettingsValidationError[] {
  const errors: SettingsValidationError[] = []
  if (!isValidUrl(settings.llamaCppBaseUrl)) {
    errors.push({ field: 'llamaCppBaseUrl', message: 'Enter a valid URL, e.g. http://127.0.0.1:8080.' })
  }
  return [...errors, ...validateLlamaCppManagedPaths(settings)]
}

export function validateProviderSettings(
  settings: ProviderSettings,
  context?: ProviderValidationContext
): SettingsValidationError[] {
  if (settings.mode === 'claude') {
    return validateClaude(settings, context)
  }
  if (settings.mode === 'openai') {
    return validateOpenAi(settings, context)
  }
  if (settings.mode === 'gemini') {
    return validateGemini(settings, context)
  }
  if (settings.mode === 'grok') {
    return validateGrok(settings, context)
  }
  if (settings.mode === 'player2') {
    return validatePlayer2(settings)
  }
  return validateLlamaCpp(settings)
}

export function redactProviderSettings(settings: ProviderSettings): RedactedProviderSettings {
  const {
    claudeApiKey,
    openaiApiKey,
    geminiApiKey,
    grokApiKey,
    ...rest
  } = settings
  return {
    ...rest,
    claudeApiKeySet: claudeApiKey.trim().length > 0,
    openaiApiKeySet: openaiApiKey.trim().length > 0,
    geminiApiKeySet: geminiApiKey.trim().length > 0,
    grokApiKeySet: grokApiKey.trim().length > 0
  }
}
