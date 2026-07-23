import { SettingsIntroAskBackend } from './SettingsIntroAskBackend'
import { SettingsIntroAskLocal } from './SettingsIntroAskLocal'
import { SettingsIntroProviderFallback } from './SettingsIntroProviderFallback'
import { SettingsIntroSetupProgress } from './SettingsIntroSetupProgress'
import type { SettingsIntroWizardController } from './useSettingsIntroWizard'

export function SettingsIntroModalBody(props: {
  wizard: SettingsIntroWizardController
  onDismiss: () => void
  onOpenSettings: () => void
}): JSX.Element {
  const { wizard } = props
  if (wizard.step === 'askLocal') {
    return (
      <SettingsIntroAskLocal
        onYes={() => wizard.chooseLocal(true)}
        onNo={() => wizard.chooseLocal(false)}
      />
    )
  }
  if (wizard.step === 'askBackend') {
    return (
      <SettingsIntroAskBackend
        backend={wizard.backend}
        onBackendChange={wizard.setBackend}
        onContinue={wizard.startSetup}
      />
    )
  }
  if (wizard.step === 'setup') {
    return (
      <SettingsIntroSetupProgress
        progressText={wizard.setupProgressText}
        progressPercent={wizard.setupProgressPercent}
        error={wizard.setupError}
        onRetry={wizard.retrySetup}
        onSkip={props.onDismiss}
      />
    )
  }
  return (
    <SettingsIntroProviderFallback
      onDismiss={props.onDismiss}
      onOpenSettings={props.onOpenSettings}
    />
  )
}
