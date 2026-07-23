import {
  isImageGenerationReady,
  type ImageProviderMode,
  type ImageProviderSettings
} from '../../../shared/settings/imageProviderSettings'
import {
  IMAGE_LOCAL_CATALOG,
  imageCatalogDisplayLabel
} from '../../../shared/settings/imageLocalCatalog'
import type { ProviderSettings } from '../../../shared/settings/types'

interface ImageGenerationSectionProps {
  draft: ProviderSettings
  openaiApiKeySet: boolean
  geminiApiKeySet: boolean
  grokApiKeySet: boolean
  downloadProgressText?: string | null
  onChange: (patch: Partial<ProviderSettings>) => void
  onDownloadModel: () => Promise<void>
}

function patchImage(
  draft: ProviderSettings,
  patch: Partial<ImageProviderSettings>
): Partial<ProviderSettings> {
  return {
    imageGeneration: {
      ...draft.imageGeneration,
      ...patch
    }
  }
}

function statusLabel(
  image: ImageProviderSettings,
  keys: { openaiApiKeySet: boolean; geminiApiKeySet: boolean; grokApiKeySet: boolean }
): string {
  const readiness = isImageGenerationReady(image, keys)
  if (!image.enabled) {
    return 'Disabled — generative tokens and portraits off'
  }
  if (readiness.ready) {
    return 'Ready'
  }
  if (readiness.reason === 'local_needs_download') {
    return 'Needs setup — download the local model'
  }
  if (readiness.reason === 'local_needs_runtime') {
    return 'Needs setup — acquire sd-server runtime'
  }
  if (readiness.reason === 'cloud_needs_key') {
    return 'Needs setup — add the cloud API key in LLM Settings'
  }
  if (readiness.reason === 'player2_needs_url') {
    return 'Needs setup — configure Player2 base URL'
  }
  return 'Needs setup'
}

function showsDualLoadWarning(draft: ProviderSettings): boolean {
  return (
    draft.mode === 'llamacpp' &&
    draft.llamaCppRuntimeBackend === 'vulkan' &&
    draft.imageGeneration.mode === 'local' &&
    draft.imageGeneration.enabled
  )
}

function modeRadios(props: ImageGenerationSectionProps): JSX.Element {
  const mode = props.draft.imageGeneration.mode
  const modes: Array<{ id: ImageProviderMode; label: string }> = [
    { id: 'openai', label: 'Cloud — OpenAI' },
    { id: 'gemini', label: 'Cloud — Gemini' },
    { id: 'grok', label: 'Cloud — Grok' },
    { id: 'player2', label: 'Player2 (local app)' },
    { id: 'local', label: 'Local sd-server' }
  ]
  return (
    <fieldset className="settings-image-mode" aria-label="Image provider mode">
      <legend>Image provider</legend>
      {modes.map((entry) => (
        <label key={entry.id} className="settings-radio-row">
          <input
            type="radio"
            name="image-provider-mode"
            checked={mode === entry.id}
            onChange={() => props.onChange(patchImage(props.draft, { mode: entry.id }))}
          />
          {entry.label}
        </label>
      ))}
    </fieldset>
  )
}

function localDownloadControls(props: ImageGenerationSectionProps): JSX.Element {
  const image = props.draft.imageGeneration
  const catalog = IMAGE_LOCAL_CATALOG[0]
  const keys = {
    openaiApiKeySet: props.openaiApiKeySet,
    geminiApiKeySet: props.geminiApiKeySet,
    grokApiKeySet: props.grokApiKeySet
  }
  return (
    <div className="settings-image-local">
      <p className="settings-help-text">
        {catalog ? imageCatalogDisplayLabel(catalog) : 'Local reference model'}
      </p>
      <p className="settings-image-status" data-testid="image-generation-status">
        Status: {statusLabel(image, keys)}
      </p>
      {props.downloadProgressText ? (
        <p className="settings-help-text">{props.downloadProgressText}</p>
      ) : null}
      <button type="button" onClick={() => void props.onDownloadModel()}>
        {image.localDownloadState === 'downloading' ? 'Downloading…' : 'Download local model'}
      </button>
    </div>
  )
}

function modeStatusLine(props: ImageGenerationSectionProps): JSX.Element | null {
  const image = props.draft.imageGeneration
  const keys = {
    openaiApiKeySet: props.openaiApiKeySet,
    geminiApiKeySet: props.geminiApiKeySet,
    grokApiKeySet: props.grokApiKeySet
  }
  if (image.mode === 'local') {
    return null
  }
  return (
    <p className="settings-image-status" data-testid="image-generation-status">
      Status: {statusLabel(image, keys)}
    </p>
  )
}

export function ImageGenerationSection(props: ImageGenerationSectionProps): JSX.Element {
  const image = props.draft.imageGeneration
  return (
    <section className="settings-section" aria-label="Image generation">
      <h3>Image generation</h3>
      <p className="settings-help-text">
        Optional portraits for generative tokens (NPCs, companions, creatures). Independent of your
        LLM provider.
      </p>
      <p className="settings-help-text">
        Claude is LLM-only and is not an image provider.
      </p>
      <label className="settings-checkbox-row">
        <input
          type="checkbox"
          checked={image.enabled}
          onChange={(event) =>
            props.onChange(patchImage(props.draft, { enabled: event.target.checked }))
          }
        />
        Enable image generation
      </label>
      {modeRadios(props)}
      {showsDualLoadWarning(props.draft) ? (
        <p className="settings-field-error" data-testid="image-dual-load-warning">
          Local LLM (Vulkan GPU) and local sd-server both use VRAM. Cards with less than about 12 GB
          may fail or thrash. Mitigations: switch LLM to CPU, rely on idle unload between jobs, or
          use cloud or Player2 for images.
        </p>
      ) : null}
      {image.mode === 'local' ? localDownloadControls(props) : null}
      {modeStatusLine(props)}
    </section>
  )
}
