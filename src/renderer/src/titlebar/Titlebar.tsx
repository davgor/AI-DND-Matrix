import { useState } from 'react'
import { APP_DISPLAY_NAME } from '../../../shared/appBranding'
import { AppVersionLabel } from '../autoUpdate/AppVersionLabel'
import { useAppUpdate } from '../autoUpdate/UpdateBanner'
import { SettingsView } from '../settings/SettingsView'
import '../settingsIntro/settingsIntro.css'
import './titlebar.css'

export interface TitlebarProps {
  highlightSettings?: boolean
  settingsOpen?: boolean
  onSettingsOpenChange?: (open: boolean) => void
}

function TitlebarBrand(): JSX.Element {
  const { currentVersion } = useAppUpdate()
  return (
    <div className="titlebar-drag-region">
      <span className="titlebar-app-name">{APP_DISPLAY_NAME}</span>
      <AppVersionLabel version={currentVersion} />
    </div>
  )
}

function TitlebarWindowControls(props: {
  highlightSettings?: boolean
  onOpenSettings: () => void
}): JSX.Element {
  return (
    <div className="titlebar-controls">
      <button
        type="button"
        aria-label="Settings"
        className={
          props.highlightSettings
            ? 'titlebar-button titlebar-button-settings-highlight'
            : 'titlebar-button'
        }
        onClick={props.onOpenSettings}
      >
        &#9881;
      </button>
      <button
        type="button"
        aria-label="Minimize"
        className="titlebar-button"
        onClick={() => window.windowControls.minimize()}
      >
        &#8211;
      </button>
      <button
        type="button"
        aria-label="Maximize"
        className="titlebar-button"
        onClick={() => window.windowControls.maximize()}
      >
        &#9633;
      </button>
      <button
        type="button"
        aria-label="Close"
        className="titlebar-button titlebar-button-close"
        onClick={() => window.windowControls.close()}
      >
        &#10005;
      </button>
    </div>
  )
}

export function Titlebar(props: TitlebarProps = {}): JSX.Element {
  const [internalSettingsOpen, setInternalSettingsOpen] = useState(false)
  const settingsOpen = props.settingsOpen ?? internalSettingsOpen
  const setSettingsOpen = props.onSettingsOpenChange ?? setInternalSettingsOpen

  return (
    <div className="titlebar">
      <TitlebarBrand />
      <TitlebarWindowControls
        highlightSettings={props.highlightSettings}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      {settingsOpen ? <SettingsView onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  )
}
