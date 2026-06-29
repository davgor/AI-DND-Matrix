import type { ProviderSettings, RedactedProviderSettings, SettingsValidationError } from './types'

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function validateClaude(settings: ProviderSettings): SettingsValidationError[] {
  if (!settings.claudeApiKey.trim()) {
    return [{ field: 'claudeApiKey', message: 'A Claude API key is required.' }]
  }
  return []
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

export function validateProviderSettings(settings: ProviderSettings): SettingsValidationError[] {
  if (settings.mode === 'claude') {
    return validateClaude(settings)
  }
  if (settings.mode === 'player2') {
    return validatePlayer2(settings)
  }
  return validateLlamaCpp(settings)
}

export function redactProviderSettings(settings: ProviderSettings): RedactedProviderSettings {
  const { claudeApiKey, ...rest } = settings
  return { ...rest, claudeApiKeySet: claudeApiKey.trim().length > 0 }
}
