import type { SettingsIntroWizardStep } from './types'

export function nextSettingsIntroStepAfterLocalChoice(
  wantLocal: boolean
): Exclude<SettingsIntroWizardStep, 'askLocal' | 'setup'> {
  return wantLocal ? 'askBackend' : 'providerFallback'
}

/** After local LLM setup succeeds, offer optional local image onboarding (152.13). */
export function nextSettingsIntroStepAfterLocalLlmSuccess(): 'askImage' {
  return 'askImage'
}
