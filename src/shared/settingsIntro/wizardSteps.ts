import type { SettingsIntroWizardStep } from './types'

export function nextSettingsIntroStepAfterLocalChoice(
  wantLocal: boolean
): Exclude<SettingsIntroWizardStep, 'askLocal' | 'setup'> {
  return wantLocal ? 'askBackend' : 'providerFallback'
}
