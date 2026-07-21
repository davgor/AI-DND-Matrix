import type { ConnectionCheckResult, SettingsValidationError } from '../../../shared/settings/types'
import { ModelPicker } from './ModelPicker'

export type CloudProviderKind = 'openai' | 'gemini' | 'grok'

interface CloudProviderSectionProps {
  kind: CloudProviderKind
  apiKey: string
  apiKeySet: boolean
  model: string
  errors: SettingsValidationError[]
  connectionResult: ConnectionCheckResult | null
  onChange: (patch: { apiKey?: string; model?: string }) => void
  onTestConnection: () => Promise<void>
}

const LABELS: Record<CloudProviderKind, { title: string; keyPlaceholder: string }> = {
  openai: { title: 'OpenAI (GPT)', keyPlaceholder: 'sk-...' },
  gemini: { title: 'Google Gemini', keyPlaceholder: 'AIza...' },
  grok: { title: 'Grok (xAI)', keyPlaceholder: 'xai-...' }
}

function fieldError(errors: SettingsValidationError[], field: string): string | undefined {
  return errors.find((error) => error.field === field)?.message
}

function keyField(kind: CloudProviderKind): string {
  return `${kind}ApiKey`
}

function modelField(kind: CloudProviderKind): string {
  return `${kind}Model`
}

export function CloudProviderSection(props: CloudProviderSectionProps): JSX.Element {
  const labels = LABELS[props.kind]
  const apiKeyError = fieldError(props.errors, keyField(props.kind))
  const modelError = fieldError(props.errors, modelField(props.kind))
  const keyId = `settings-${props.kind}-api-key`

  return (
    <section className="settings-section" aria-label={`${labels.title} settings`}>
      <h3>{labels.title}</h3>
      <label htmlFor={keyId}>
        API key {props.apiKeySet && <span className="settings-secret-badge">saved</span>}
      </label>
      <input
        id={keyId}
        type="password"
        autoComplete="off"
        placeholder={props.apiKeySet ? 'Enter a new key to replace the saved one' : labels.keyPlaceholder}
        value={props.apiKey}
        onChange={(event) => props.onChange({ apiKey: event.target.value })}
      />
      {apiKeyError && <p className="settings-field-error">{apiKeyError}</p>}
      <ModelPicker
        provider={props.kind}
        modelId={props.model}
        error={modelError}
        idPrefix={`settings-${props.kind}`}
        onChange={(model) => props.onChange({ model })}
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
