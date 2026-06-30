import './settingsIntro.css'
import { SettingsIntroModalBody } from './SettingsIntroModalBody'

export interface SettingsIntroModalProps {
  onDismiss: () => void
  onOpenSettings: () => void
}

export function SettingsIntroModal(props: SettingsIntroModalProps): JSX.Element {
  return (
    <div className="settings-intro-overlay" role="presentation">
      <div
        className="settings-intro-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-intro-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            props.onDismiss()
          }
        }}
      >
        <SettingsIntroModalBody onDismiss={props.onDismiss} onOpenSettings={props.onOpenSettings} />
      </div>
    </div>
  )
}
