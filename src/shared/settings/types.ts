export type ProviderMode = 'claude' | 'openai' | 'gemini' | 'grok' | 'player2' | 'llamacpp'

export interface ProviderSettings {
  mode: ProviderMode
  claudeApiKey: string
  claudeModel: string
  openaiApiKey: string
  openaiModel: string
  geminiApiKey: string
  geminiModel: string
  grokApiKey: string
  grokModel: string
  llamaCppBaseUrl: string
  llamaCppServerPath: string
  llamaCppModelPath: string
  llamaCppCtxSize: number
  llamaCppGpuLayers: string
  llamaCppStartMode: 'managed' | 'attach'
  player2BaseUrl: string
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  mode: 'player2',
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-6',
  openaiApiKey: '',
  openaiModel: 'gpt-4.1-mini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  grokApiKey: '',
  grokModel: 'grok-3',
  llamaCppBaseUrl: 'http://127.0.0.1:8080',
  llamaCppServerPath: '',
  llamaCppModelPath: '',
  llamaCppCtxSize: 8192,
  llamaCppGpuLayers: 'all',
  llamaCppStartMode: 'attach',
  player2BaseUrl: 'http://127.0.0.1:4315'
}

type ProviderApiKeyField = 'claudeApiKey' | 'openaiApiKey' | 'geminiApiKey' | 'grokApiKey'

export interface RedactedProviderSettings
  extends Omit<ProviderSettings, ProviderApiKeyField> {
  claudeApiKeySet: boolean
  openaiApiKeySet: boolean
  geminiApiKeySet: boolean
  grokApiKeySet: boolean
}

export interface SettingsValidationError {
  field: string
  message: string
}

export interface SaveProviderSettingsInput
  extends Omit<ProviderSettings, ProviderApiKeyField> {
  claudeApiKey?: string
  openaiApiKey?: string
  geminiApiKey?: string
  grokApiKey?: string
}

export interface ProviderValidationContext {
  claudeApiKeySet?: boolean
  openaiApiKeySet?: boolean
  geminiApiKeySet?: boolean
  grokApiKeySet?: boolean
}

export interface ConnectionCheckResult {
  ok: boolean
  message: string
}
