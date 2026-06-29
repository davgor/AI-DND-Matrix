import { useState } from 'react'
import { SettingsView } from '../settings/SettingsView'
import './titlebar.css'

export function Titlebar(): JSX.Element {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region">AI D&D Matrix</div>
      <div className="titlebar-controls">
        <button
          type="button"
          aria-label="Settings"
          className="titlebar-button"
          onClick={() => setSettingsOpen(true)}
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
      {settingsOpen && <SettingsView onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
