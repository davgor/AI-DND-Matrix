import type { ConnectionCheckResult, ProviderSettings, SettingsValidationError } from '../../../shared/settings/types'

export interface LlamaLocalSectionProps {
  draft: ProviderSettings
  errors: SettingsValidationError[]
  result: ConnectionCheckResult | null
  onChange: (patch: Partial<ProviderSettings>) => void
  onCheckRuntime: () => Promise<void>
}

function fieldError(errors: SettingsValidationError[], field: string): string | undefined {
  return errors.find((error) => error.field === field)?.message
}

function ManagedModeFields(props: LlamaLocalSectionProps): JSX.Element {
  return (
    <>
      <label htmlFor="settings-llama-server-path">llama-server executable path</label>
      <input
        id="settings-llama-server-path"
        type="text"
        value={props.draft.llamaCppServerPath}
        onChange={(event) => props.onChange({ llamaCppServerPath: event.target.value })}
      />
      {fieldError(props.errors, 'llamaCppServerPath') && (
        <p className="settings-field-error">{fieldError(props.errors, 'llamaCppServerPath')}</p>
      )}
      <label htmlFor="settings-llama-model-path">Model (.gguf) path</label>
      <input
        id="settings-llama-model-path"
        type="text"
        value={props.draft.llamaCppModelPath}
        onChange={(event) => props.onChange({ llamaCppModelPath: event.target.value })}
      />
      {fieldError(props.errors, 'llamaCppModelPath') && (
        <p className="settings-field-error">{fieldError(props.errors, 'llamaCppModelPath')}</p>
      )}
    </>
  )
}

export function LlamaLocalSection(props: LlamaLocalSectionProps): JSX.Element {
  const baseUrlError = fieldError(props.errors, 'llamaCppBaseUrl')

  return (
    <section className="settings-section" aria-label="Local llama.cpp runtime">
      <h3>Local llama.cpp runtime</h3>
      <label htmlFor="settings-llama-start-mode">Startup mode</label>
      <select
        id="settings-llama-start-mode"
        value={props.draft.llamaCppStartMode}
        onChange={(event) =>
          props.onChange({ llamaCppStartMode: event.target.value as ProviderSettings['llamaCppStartMode'] })
        }
      >
        <option value="attach">Attach (llama-server already running)</option>
        <option value="managed">Managed (app launches llama-server)</option>
      </select>
      <label htmlFor="settings-llama-base-url">Base URL</label>
      <input
        id="settings-llama-base-url"
        type="text"
        placeholder="http://127.0.0.1:8080"
        value={props.draft.llamaCppBaseUrl}
        onChange={(event) => props.onChange({ llamaCppBaseUrl: event.target.value })}
      />
      {baseUrlError && <p className="settings-field-error">{baseUrlError}</p>}
      {props.draft.llamaCppStartMode === 'managed' && <ManagedModeFields {...props} />}
      <button type="button" onClick={() => void props.onCheckRuntime()}>
        Check runtime
      </button>
      {props.result && (
        <p className={props.result.ok ? 'settings-check-ok' : 'settings-check-failed'}>{props.result.message}</p>
      )}
    </section>
  )
}
