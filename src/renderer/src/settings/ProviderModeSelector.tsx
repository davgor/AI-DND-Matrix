import type { ProviderMode } from '../../../shared/settings/types'

export interface ProviderModeSelectorProps {
  mode: ProviderMode
  onChange: (mode: ProviderMode) => void
}

const MODES: { value: ProviderMode; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'GPT (OpenAI)' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'grok', label: 'Grok (xAI)' },
  { value: 'player2', label: 'Player2' },
  { value: 'llamacpp', label: 'Local llama.cpp' }
]

export function ProviderModeSelector(props: ProviderModeSelectorProps): JSX.Element {
  return (
    <div className="settings-provider-mode">
      <label htmlFor="settings-provider-mode">Provider</label>
      <select
        id="settings-provider-mode"
        aria-label="Provider"
        value={props.mode}
        onChange={(event) => props.onChange(event.target.value as ProviderMode)}
      >
        {MODES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
