import {
  PLAYER2_INSTALL_URL,
  SETTINGS_INTRO_PROVIDER_OPTIONS
} from '../../../shared/settingsIntro/types'

export function SettingsIntroProviderFallback(props: {
  onDismiss: () => void
  onOpenSettings: () => void
}): JSX.Element {
  return (
    <>
      <h2 id="settings-intro-title">Set up your AI provider</h2>
      <p className="settings-intro-lead">
        Before you start a campaign, choose how this app talks to the models that power your DM,
        NPCs, and party members.
      </p>
      <p className="settings-intro-settings-callout">
        Open <strong>Settings</strong> with the <strong>gear icon</strong> in the top-right corner
        of the window.
      </p>
      <ul className="settings-intro-provider-list">
        {SETTINGS_INTRO_PROVIDER_OPTIONS.map((option) => (
          <li key={option.id}>
            {option.label}
            {option.default ? <span className="settings-intro-default-tag"> (default)</span> : null}
          </li>
        ))}
      </ul>
      <p className="settings-intro-install-note">
        Player2 runs locally on your machine. If you do not have it installed yet, visit{' '}
        <button
          type="button"
          className="settings-intro-install-link"
          onClick={() => void window.settingsIntro.openPlayer2InstallPage()}
        >
          {PLAYER2_INSTALL_URL}
        </button>{' '}
        to download and install it, then return here to confirm the connection in Settings.
      </p>
      <footer className="settings-intro-actions">
        <button type="button" onClick={props.onDismiss}>
          Got it
        </button>
        <button type="button" className="settings-intro-primary" onClick={props.onOpenSettings}>
          Open Settings
        </button>
      </footer>
    </>
  )
}
