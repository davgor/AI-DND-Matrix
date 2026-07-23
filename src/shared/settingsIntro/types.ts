export const PLAYER2_INSTALL_URL = 'https://player2.game/'

export const SETTINGS_INTRO_PROVIDER_OPTIONS = [
  { id: 'player2', label: 'Player2 (local endpoint)', default: true },
  { id: 'claude', label: 'Claude (API key)', default: false },
  { id: 'llamacpp', label: 'Local llama.cpp', default: false }
] as const

export type SettingsIntroWizardStep =
  | 'askLocal'
  | 'askBackend'
  | 'setup'
  | 'providerFallback'

export interface SettingsIntroState {
  shouldShow: boolean
  devForceShow: boolean
}
