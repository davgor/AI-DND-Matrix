import './settingsIntro.css'
import { SettingsIntroModalBody } from './SettingsIntroModalBody'
import { useSettingsIntroWizard } from './useSettingsIntroWizard'

interface SettingsIntroModalProps {
  onDismiss: () => void
  onOpenSettings: () => void
}

export function SettingsIntroModal(props: SettingsIntroModalProps): JSX.Element {
  const wizard = useSettingsIntroWizard(props.onDismiss)
  return (
    <div className="settings-intro-overlay" role="presentation">
      <div
        className="settings-intro-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-intro-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && wizard.step !== 'setup') {
            props.onDismiss()
          }
        }}
      >
        <SettingsIntroModalBody
          wizard={wizard}
          onDismiss={props.onDismiss}
          onOpenSettings={props.onOpenSettings}
        />
      </div>
    </div>
  )
}
