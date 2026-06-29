import type { SettingsValidationError } from '../../../shared/settings/types'

export interface ApiKeySectionProps {
  claudeApiKey: string
  claudeApiKeySet: boolean
  claudeModel: string
  errors: SettingsValidationError[]
  onChange: (patch: { claudeApiKey?: string; claudeModel?: string }) => void
}

function fieldError(errors: SettingsValidationError[], field: string): string | undefined {
  return errors.find((error) => error.field === field)?.message
}

export function ApiKeySection(props: ApiKeySectionProps): JSX.Element {
  const apiKeyError = fieldError(props.errors, 'claudeApiKey')

  return (
    <section className="settings-section" aria-label="Claude API key">
      <h3>Claude API key</h3>
      <label htmlFor="settings-claude-api-key">
        API key {props.claudeApiKeySet && <span className="settings-secret-badge">saved</span>}
      </label>
      <input
        id="settings-claude-api-key"
        type="password"
        autoComplete="off"
        placeholder={props.claudeApiKeySet ? 'Enter a new key to replace the saved one' : 'sk-ant-...'}
        value={props.claudeApiKey}
        onChange={(event) => props.onChange({ claudeApiKey: event.target.value })}
      />
      {apiKeyError && <p className="settings-field-error">{apiKeyError}</p>}
      <label htmlFor="settings-claude-model">Model</label>
      <input
        id="settings-claude-model"
        type="text"
        value={props.claudeModel}
        onChange={(event) => props.onChange({ claudeModel: event.target.value })}
      />
    </section>
  )
}
