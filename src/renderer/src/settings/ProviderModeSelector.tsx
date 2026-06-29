import type { ProviderMode } from '../../../shared/settings/types'

export interface ProviderModeSelectorProps {
  mode: ProviderMode
  onChange: (mode: ProviderMode) => void
}

const MODES: { value: ProviderMode; label: string }[] = [
  { value: 'claude', label: 'Claude (API key)' },
  { value: 'llamacpp', label: 'Local llama.cpp' },
  { value: 'player2', label: 'Player2 (local endpoint)' }
]

export function ProviderModeSelector(props: ProviderModeSelectorProps): JSX.Element {
  return (
    <fieldset className="settings-provider-mode">
      <legend>Provider</legend>
      {MODES.map((option) => (
        <label key={option.value} className="settings-provider-mode-option">
          <input
            type="radio"
            name="provider-mode"
            value={option.value}
            checked={props.mode === option.value}
            onChange={() => props.onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}
