import { LLAMACPP_MODEL_CATALOG } from '../../../shared/settings/llamaCppCatalog'
import type {
  ConnectionCheckResult,
  LlamaCppDownloadState,
  ProviderSettings,
  SettingsValidationError
} from '../../../shared/settings/types'

interface LlamaLocalSectionProps {
  draft: ProviderSettings
  errors: SettingsValidationError[]
  result: ConnectionCheckResult | null
  downloadProgressText?: string | null
  runtimeStatusText?: string | null
  onChange: (patch: Partial<ProviderSettings>) => void
  onCheckRuntime: () => Promise<void>
  onDownloadModel?: () => Promise<void>
  onCancelDownload?: () => Promise<void>
  onAcquireRuntime?: () => Promise<void>
}

function fieldError(errors: SettingsValidationError[], field: string): string | undefined {
  return errors.find((error) => error.field === field)?.message
}

function downloadStateLabel(state: LlamaCppDownloadState): string {
  switch (state) {
    case 'ready':
      return 'Ready'
    case 'downloading':
      return 'Downloading…'
    case 'failed':
      return 'Failed'
    default:
      return 'Not downloaded'
  }
}

function catalogEntryRow(
  entry: (typeof LLAMACPP_MODEL_CATALOG)[number],
  draft: ProviderSettings,
  onChange: (patch: Partial<ProviderSettings>) => void
): JSX.Element {
  const selected = draft.llamaCppCatalogModelId === entry.id
  const state = selected ? draft.llamaCppDownloadState : 'idle'
  return (
    <li key={entry.id}>
      <label className="settings-llama-catalog-entry">
        <input
          type="radio"
          name="llama-catalog-model"
          checked={selected}
          onChange={() =>
            onChange({
              llamaCppCatalogModelId: entry.id,
              llamaCppDownloadState: selected ? draft.llamaCppDownloadState : 'idle'
            })
          }
        />
        <span>
          <strong>{entry.label}</strong>
          <span className="settings-help-text">
            {entry.approxDownloadSize} · {entry.vramHint}
          </span>
          {selected && (
            <span className="settings-llama-download-state" data-state={state}>
              {downloadStateLabel(state)}
            </span>
          )}
        </span>
      </label>
    </li>
  )
}

function catalogFieldset(props: LlamaLocalSectionProps): JSX.Element {
  return (
    <fieldset className="settings-llama-catalog" aria-label="Recommended models">
      <legend>Recommended models</legend>
      <ul className="settings-llama-catalog-list">
        {LLAMACPP_MODEL_CATALOG.map((entry) =>
          catalogEntryRow(entry, props.draft, props.onChange)
        )}
      </ul>
    </fieldset>
  )
}

function downloadActions(props: LlamaLocalSectionProps): JSX.Element {
  const canDownload = props.draft.llamaCppCatalogModelId.trim().length > 0
  const downloading = props.draft.llamaCppDownloadState === 'downloading'
  return (
    <div className="settings-llama-actions">
      <button
        type="button"
        disabled={!canDownload || downloading}
        onClick={() => void props.onDownloadModel?.()}
      >
        {downloading ? 'Downloading…' : 'Download model'}
      </button>
      {downloading && (
        <button type="button" onClick={() => void props.onCancelDownload?.()}>
          Cancel download
        </button>
      )}
      <button type="button" onClick={() => void props.onAcquireRuntime?.()}>
        Acquire runtime
      </button>
    </div>
  )
}

function statusTexts(props: LlamaLocalSectionProps): JSX.Element | null {
  if (!props.downloadProgressText && !props.runtimeStatusText) {
    return null
  }
  return (
    <>
      {props.downloadProgressText && (
        <p className="settings-help-text">{props.downloadProgressText}</p>
      )}
      {props.runtimeStatusText && (
        <p className="settings-help-text">{props.runtimeStatusText}</p>
      )}
    </>
  )
}

function startupModeFields(props: LlamaLocalSectionProps): JSX.Element {
  const baseUrlError = fieldError(props.errors, 'llamaCppBaseUrl')
  return (
    <>
      <label htmlFor="settings-llama-start-mode">Startup mode</label>
      <select
        id="settings-llama-start-mode"
        value={props.draft.llamaCppStartMode}
        onChange={(event) =>
          props.onChange({
            llamaCppStartMode: event.target.value as ProviderSettings['llamaCppStartMode']
          })
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
    </>
  )
}

function managedPathFields(props: LlamaLocalSectionProps): JSX.Element {
  return (
    <>
      <p className="settings-help-text">
        Prefer a recommended model above. Advanced paths below are for BYO installs (
        <code>winget install llama.cpp</code> or a GitHub release).
      </p>
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

function advancedPaths(props: LlamaLocalSectionProps): JSX.Element | null {
  if (props.draft.llamaCppStartMode !== 'managed') {
    return null
  }
  const advancedOpen =
    props.draft.llamaCppServerPath.trim().length > 0 ||
    props.draft.llamaCppModelPath.trim().length > 0
  return (
    <details className="settings-llama-advanced" open={advancedOpen}>
      <summary>Advanced: manual server &amp; model paths</summary>
      {managedPathFields(props)}
    </details>
  )
}

function runtimeCheckRow(props: LlamaLocalSectionProps): JSX.Element {
  return (
    <>
      <button type="button" onClick={() => void props.onCheckRuntime()}>
        Check runtime
      </button>
      {props.result && (
        <p className={props.result.ok ? 'settings-check-ok' : 'settings-check-failed'}>
          {props.result.message}
        </p>
      )}
    </>
  )
}

export function LlamaLocalSection(props: LlamaLocalSectionProps): JSX.Element {
  return (
    <section className="settings-section" aria-label="Local llama.cpp runtime">
      <h3>Local llama.cpp</h3>
      {catalogFieldset(props)}
      {downloadActions(props)}
      {statusTexts(props)}
      {startupModeFields(props)}
      {advancedPaths(props)}
      {runtimeCheckRow(props)}
    </section>
  )
}
