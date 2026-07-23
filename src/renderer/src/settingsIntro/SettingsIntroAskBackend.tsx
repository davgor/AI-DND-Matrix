import type { LocalLlmFirstRunBackend } from './runLocalLlmFirstRunSetup'

const BACKEND_OPTIONS: Array<{ value: LocalLlmFirstRunBackend; label: string }> = [
  { value: 'vulkan', label: 'GPU (Vulkan)' },
  { value: 'cpu', label: 'CPU' }
]

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
        <div
          className="settings-intro-backend-options"
          role="radiogroup"
          aria-label="Hardware"
        >
          {BACKEND_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="settings-intro-backend-option"
              htmlFor={`settings-intro-runtime-${option.value === 'vulkan' ? 'gpu' : 'cpu'}`}
            >
              <input
                id={`settings-intro-runtime-${option.value === 'vulkan' ? 'gpu' : 'cpu'}`}
                type="radio"
                name="settings-intro-runtime-backend"
                value={option.value}
                checked={props.backend === option.value}
                onChange={() => props.onBackendChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <footer className="settings-intro-actions">
        <button type="button" className="settings-intro-primary" onClick={props.onContinue}>
          Download and set up
        </button>
      </footer>
    </>
  )
}
