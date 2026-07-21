import type { ConnectionCheckResult, SettingsValidationError } from '../../../shared/settings/types'
import { ModelPicker } from './ModelPicker'

interface ApiKeySectionProps {
  claudeApiKey: string
  claudeApiKeySet: boolean
  claudeModel: string
  errors: SettingsValidationError[]
  connectionResult: ConnectionCheckResult | null
  onChange: (patch: { claudeApiKey?: string; claudeModel?: string }) => void
  onTestConnection: () => Promise<void>
}

function fieldError(errors: SettingsValidationError[], field: string): string | undefined {
  return errors.find((error) => error.field === field)?.message
}

export function ApiKeySection(props: ApiKeySectionProps): JSX.Element {
  const apiKeyError = fieldError(props.errors, 'claudeApiKey')
  const modelError = fieldError(props.errors, 'claudeModel')

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
      <ModelPicker
        provider="claude"
        modelId={props.claudeModel}
        error={modelError}
        idPrefix="settings-claude"
        onChange={(claudeModel) => props.onChange({ claudeModel })}
      />
      <button type="button" onClick={() => void props.onTestConnection()}>
        Test connection
      </button>
      {props.connectionResult && (
        <p className={props.connectionResult.ok ? 'settings-check-ok' : 'settings-check-failed'}>
          {props.connectionResult.message}
        </p>
      )}
    </section>
  )
}
