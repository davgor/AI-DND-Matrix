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

function catalogModelReady(settings: ProviderSettings): boolean {
  return (
    settings.llamaCppCatalogModelId.trim().length > 0 && settings.llamaCppDownloadState === 'ready'
  )
}

function validateLlamaCppManagedPaths(settings: ProviderSettings): SettingsValidationError[] {
  if (settings.llamaCppStartMode !== 'managed') {
    return []
  }
  const errors: SettingsValidationError[] = []
  const usingCatalog = settings.llamaCppCatalogModelId.trim().length > 0
  if (!settings.llamaCppServerPath.trim() && !usingCatalog) {
    errors.push({
      field: 'llamaCppServerPath',
      message: 'Managed mode requires a path to the llama-server executable.'
    })
  }
  if (!settings.llamaCppModelPath.trim() && !catalogModelReady(settings)) {
    errors.push({
      field: 'llamaCppModelPath',
      message: usingCatalog
        ? 'Download the selected catalog model before saving, or set an advanced model path.'
        : 'Managed mode requires a path to a .gguf model file.'
    })
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

interface CloudImageValidationInput {
  settings: ProviderSettings
  context?: ProviderValidationContext
  keyField: 'openaiApiKey' | 'geminiApiKey' | 'grokApiKey'
  keyLabel: 'OpenAI' | 'Gemini' | 'Grok'
  keySetField: 'openaiApiKeySet' | 'geminiApiKeySet' | 'grokApiKeySet'
  model: string
  modelField: string
}

function validateCloudImageMode(input: CloudImageValidationInput): SettingsValidationError[] {
  return [
    ...requireApiKey(
      input.settings[input.keyField],
      input.keyField,
      input.keyLabel,
      input.context?.[input.keySetField]
    ),
    ...requireModel(input.model, input.modelField, `${input.keyLabel} image`)
  ]
}

function validatePlayer2ImageMode(image: ProviderSettings['imageGeneration']): SettingsValidationError[] {
  if (!isValidUrl(image.player2BaseUrl)) {
    return [
      {
        field: 'imageGeneration.player2BaseUrl',
        message: 'Enter a valid Player2 URL, e.g. http://127.0.0.1:4315.'
      }
    ]
  }
  return []
}

function validateLocalImageMode(image: ProviderSettings['imageGeneration']): SettingsValidationError[] {
  if (!isValidUrl(image.localBaseUrl)) {
    return [
      {
        field: 'imageGeneration.localBaseUrl',
        message: 'Enter a valid local image URL, e.g. http://127.0.0.1:8190.'
      }
    ]
  }
  if (image.localDownloadState !== 'ready' || !image.localModelPath.trim()) {
    return [
      {
        field: 'imageGeneration.localModelPath',
        message: 'Download the local image model before enabling image generation.'
      }
    ]
  }
  if (image.localStartMode === 'managed' && !image.localServerPath.trim()) {
    return [
      {
        field: 'imageGeneration.localServerPath',
        message: 'Acquire the local image runtime before enabling image generation.'
      }
    ]
  }
  return []
}

function validateImageGeneration(
  settings: ProviderSettings,
  context?: ProviderValidationContext
): SettingsValidationError[] {
  const image = settings.imageGeneration
  if (!image.enabled) {
    return []
  }
  if (image.mode === 'openai') {
    return validateCloudImageMode({
      settings,
      context,
      keyField: 'openaiApiKey',
      keyLabel: 'OpenAI',
      keySetField: 'openaiApiKeySet',
      model: image.openaiImageModel,
      modelField: 'imageGeneration.openaiImageModel'
    })
  }
  if (image.mode === 'gemini') {
    return validateCloudImageMode({
      settings,
      context,
      keyField: 'geminiApiKey',
      keyLabel: 'Gemini',
      keySetField: 'geminiApiKeySet',
      model: image.geminiImageModel,
      modelField: 'imageGeneration.geminiImageModel'
    })
  }
  if (image.mode === 'grok') {
    return validateCloudImageMode({
      settings,
      context,
      keyField: 'grokApiKey',
      keyLabel: 'Grok',
      keySetField: 'grokApiKeySet',
      model: image.grokImageModel,
      modelField: 'imageGeneration.grokImageModel'
    })
  }
  if (image.mode === 'player2') {
    return validatePlayer2ImageMode(image)
  }
  return validateLocalImageMode(image)
}

export function validateProviderSettings(
  settings: ProviderSettings,
  context?: ProviderValidationContext
): SettingsValidationError[] {
  const imageErrors = validateImageGeneration(settings, context)
  let modeErrors: SettingsValidationError[]
  if (settings.mode === 'claude') {
    modeErrors = validateClaude(settings, context)
  } else if (settings.mode === 'openai') {
    modeErrors = validateOpenAi(settings, context)
  } else if (settings.mode === 'gemini') {
    modeErrors = validateGemini(settings, context)
  } else if (settings.mode === 'grok') {
    modeErrors = validateGrok(settings, context)
  } else if (settings.mode === 'player2') {
    modeErrors = validatePlayer2(settings)
  } else {
    modeErrors = validateLlamaCpp(settings)
  }
  return [...modeErrors, ...imageErrors]
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
