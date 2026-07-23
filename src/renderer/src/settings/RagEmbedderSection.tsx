import {
  isRagEmbedderReady,
  type RagEmbedderSettings
} from '../../../shared/rag/embedderSettings'
import { RAG_LOCAL_CATALOG } from '../../../shared/rag/localCatalog'
import type { ProviderSettings } from '../../../shared/settings/types'

export interface RagEmbedderSectionProps {
  draft: ProviderSettings
  openaiApiKeySet: boolean
  geminiApiKeySet: boolean
  downloadProgressText?: string | null
  onChange: (patch: Partial<ProviderSettings>) => void
  onDownloadModel: () => Promise<void>
}

function statusLabel(
  rag: RagEmbedderSettings,
  keys: { openaiApiKeySet: boolean; geminiApiKeySet: boolean }
): string {
  const readiness = isRagEmbedderReady(rag, keys)
  if (!rag.enabled) {
    return 'Using fallback (RAG embeddings off)'
  }
  if (readiness.ready) {
    return 'Ready'
  }
  if (readiness.reason === 'local_needs_download') {
    return 'Needs setup — download the local model'
  }
  if (readiness.reason === 'cloud_needs_key') {
    return 'Needs setup — add the cloud API key in LLM Settings'
  }
  if (rag.mode === 'lexical') {
    return 'Using lexical keyword matching (not neural meaning)'
  }
  return 'Needs setup'
}

function patchRag(
  draft: ProviderSettings,
  patch: Partial<RagEmbedderSettings>
): Partial<ProviderSettings> {
  return {
    ragEmbedder: {
      ...draft.ragEmbedder,
      ...patch
    }
  }
}

function modeRadios(props: {
  draft: ProviderSettings
  onChange: (patch: Partial<ProviderSettings>) => void
}): JSX.Element {
  const mode = props.draft.ragEmbedder.mode
  return (
    <fieldset className="settings-rag-mode" aria-label="Embedder mode">
      <legend>Mode</legend>
      <label className="settings-radio-row">
        <input
          type="radio"
          name="rag-embedder-mode"
          checked={mode === 'local_neural'}
          onChange={() => props.onChange(patchRag(props.draft, { mode: 'local_neural' }))}
        />
        Local neural (MiniLM)
      </label>
      <label className="settings-radio-row">
        <input
          type="radio"
          name="rag-embedder-mode"
          checked={mode === 'openai'}
          onChange={() => props.onChange(patchRag(props.draft, { mode: 'openai' }))}
        />
        Cloud — OpenAI
      </label>
      <label className="settings-radio-row">
        <input
          type="radio"
          name="rag-embedder-mode"
          checked={mode === 'gemini'}
          onChange={() => props.onChange(patchRag(props.draft, { mode: 'gemini' }))}
        />
        Cloud — Gemini
      </label>
      <label className="settings-radio-row">
        <input
          type="radio"
          name="rag-embedder-mode"
          checked={mode === 'lexical'}
          onChange={() => props.onChange(patchRag(props.draft, { mode: 'lexical' }))}
        />
        Lexical keyword matching
      </label>
    </fieldset>
  )
}

function localDownloadControls(props: RagEmbedderSectionProps): JSX.Element {
  const rag = props.draft.ragEmbedder
  const catalog = RAG_LOCAL_CATALOG[0]
  const sizeMb = catalog ? Math.round(catalog.sizeBytes / (1024 * 1024)) : 90
  const keys = {
    openaiApiKeySet: props.openaiApiKeySet,
    geminiApiKeySet: props.geminiApiKeySet
  }
  return (
    <div className="settings-rag-local">
      <p className="settings-help-text">
        {catalog?.label ?? 'MiniLM'} · ~{sizeMb} MB download · ~{catalog?.ramHintMb ?? 256} MB RAM
      </p>
      <p className="settings-rag-status" data-testid="rag-status">
        Status: {statusLabel(rag, keys)}
      </p>
      {props.downloadProgressText && (
        <p className="settings-help-text">{props.downloadProgressText}</p>
      )}
      <button type="button" onClick={() => void props.onDownloadModel()}>
        {rag.localDownloadState === 'downloading' ? 'Downloading…' : 'Download local model'}
      </button>
    </div>
  )
}

function modeStatusLine(props: RagEmbedderSectionProps): JSX.Element | null {
  const rag = props.draft.ragEmbedder
  const keys = {
    openaiApiKeySet: props.openaiApiKeySet,
    geminiApiKeySet: props.geminiApiKeySet
  }
  if (rag.mode === 'local_neural') {
    return null
  }
  if (rag.mode === 'openai') {
    return (
      <p className="settings-rag-status" data-testid="rag-status">
        Status: {statusLabel(rag, keys)} · model {rag.openaiEmbeddingModel}
      </p>
    )
  }
  if (rag.mode === 'gemini') {
    return (
      <p className="settings-rag-status" data-testid="rag-status">
        Status: {statusLabel(rag, keys)} · model {rag.geminiEmbeddingModel}
      </p>
    )
  }
  return (
    <p className="settings-rag-status" data-testid="rag-status">
      Status: {statusLabel(rag, keys)}
    </p>
  )
}

export function RagEmbedderSection(props: RagEmbedderSectionProps): JSX.Element {
  const rag = props.draft.ragEmbedder
  return (
    <section className="settings-section" aria-label="Memory RAG embeddings">
      <h3>Memory / RAG embeddings</h3>
      <p className="settings-help-text">
        Choose how campaign memory is vectorized for retrieval. Lexical mode uses keyword hashing —
        not neural meaning matching.
      </p>
      <label className="settings-checkbox-row">
        <input
          type="checkbox"
          checked={rag.enabled}
          onChange={(event) =>
            props.onChange(patchRag(props.draft, { enabled: event.target.checked }))
          }
        />
        Enable RAG embeddings
      </label>
      {modeRadios({ draft: props.draft, onChange: props.onChange })}
      {rag.mode === 'local_neural' ? localDownloadControls(props) : null}
      {modeStatusLine(props)}
    </section>
  )
}
