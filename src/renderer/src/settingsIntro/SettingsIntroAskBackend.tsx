import type { LocalLlmFirstRunBackend } from './runLocalLlmFirstRunSetup'

export function SettingsIntroAskBackend(props: {
  backend: LocalLlmFirstRunBackend
  onBackendChange: (backend: LocalLlmFirstRunBackend) => void
  onContinue: () => void
}): JSX.Element {
  return (
    <>
      <h2 id="settings-intro-title">GPU or CPU?</h2>
      <p className="settings-intro-lead">
        Choose how the local runtime should run. GPU (Vulkan) is recommended when you have a
        compatible graphics card.
      </p>
      <fieldset className="settings-intro-backend" aria-label="Runtime backend">
        <legend>Hardware</legend>
        <label className="settings-intro-backend-option" htmlFor="settings-intro-runtime-gpu">
          <input
            id="settings-intro-runtime-gpu"
            type="checkbox"
            checked={props.backend === 'vulkan'}
            onChange={(event) => {
              if (event.target.checked) {
                props.onBackendChange('vulkan')
              }
            }}
          />
          <span>GPU (Vulkan)</span>
        </label>
        <label className="settings-intro-backend-option" htmlFor="settings-intro-runtime-cpu">
          <input
            id="settings-intro-runtime-cpu"
            type="checkbox"
            checked={props.backend === 'cpu'}
            onChange={(event) => {
              if (event.target.checked) {
                props.onBackendChange('cpu')
              }
            }}
          />
          <span>CPU</span>
        </label>
      </fieldset>
      <footer className="settings-intro-actions">
        <button type="button" className="settings-intro-primary" onClick={props.onContinue}>
          Download and set up
        </button>
      </footer>
    </>
  )
}
