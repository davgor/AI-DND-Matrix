export type ProviderMode = 'claude' | 'llamacpp' | 'player2'

export interface ProviderSettings {
  mode: ProviderMode
  claudeApiKey: string
  claudeModel: string
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
  llamaCppBaseUrl: 'http://127.0.0.1:8080',
  llamaCppServerPath: '',
  llamaCppModelPath: '',
  llamaCppCtxSize: 8192,
  llamaCppGpuLayers: 'all',
  llamaCppStartMode: 'attach',
  player2BaseUrl: 'http://127.0.0.1:4315'
}

export interface RedactedProviderSettings extends Omit<ProviderSettings, 'claudeApiKey'> {
  claudeApiKeySet: boolean
}

export interface SettingsValidationError {
  field: string
  message: string
}

export interface SaveProviderSettingsInput extends Omit<ProviderSettings, 'claudeApiKey'> {
  claudeApiKey?: string
}

export interface ConnectionCheckResult {
  ok: boolean
  message: string
}
