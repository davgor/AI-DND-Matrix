/**
 * RAG embedder Settings — portable types (no Electron). Epic 154.
 */

export type RagEmbedderMode = 'lexical' | 'local_neural' | 'openai' | 'gemini'

export type RagLocalDownloadState = 'idle' | 'downloading' | 'ready' | 'failed'

export interface RagEmbedderSettings {
  mode: RagEmbedderMode
  /** When false, retrieval falls back to recency/tag / lexical only. */
  enabled: boolean
  openaiEmbeddingModel: string
  geminiEmbeddingModel: string
  localCatalogModelId: string
  localDownloadState: RagLocalDownloadState
  /** Absolute or app-relative model dir once ready; empty until download. */
  localModelPath: string
}

export const DEFAULT_RAG_EMBEDDER_SETTINGS: RagEmbedderSettings = {
  mode: 'lexical',
  enabled: false,
  openaiEmbeddingModel: 'text-embedding-3-small',
  geminiEmbeddingModel: 'text-embedding-004',
  localCatalogModelId: 'all-minilm-l6-v2-onnx',
  localDownloadState: 'idle',
  localModelPath: ''
}

export type RagEmbedderReadyReason =
  | 'ready'
  | 'disabled'
  | 'local_needs_download'
  | 'cloud_needs_key'
  | 'unsupported_mode'

export interface RagEmbedderReadiness {
  ready: boolean
  reason: RagEmbedderReadyReason
}

export interface RagEmbedderKeyFlags {
  openaiApiKeySet: boolean
  geminiApiKeySet: boolean
}

export function isRagEmbedderReady(
  settings: RagEmbedderSettings,
  keys: RagEmbedderKeyFlags
): RagEmbedderReadiness {
  if (!settings.enabled) {
    return { ready: false, reason: 'disabled' }
  }
  if (settings.mode === 'lexical') {
    return { ready: true, reason: 'ready' }
  }
  if (settings.mode === 'local_neural') {
    if (settings.localDownloadState !== 'ready' || !settings.localModelPath.trim()) {
      return { ready: false, reason: 'local_needs_download' }
    }
    return { ready: true, reason: 'ready' }
  }
  if (settings.mode === 'openai') {
    return keys.openaiApiKeySet
      ? { ready: true, reason: 'ready' }
      : { ready: false, reason: 'cloud_needs_key' }
  }
  if (settings.mode === 'gemini') {
    return keys.geminiApiKeySet
      ? { ready: true, reason: 'ready' }
      : { ready: false, reason: 'cloud_needs_key' }
  }
  return { ready: false, reason: 'unsupported_mode' }
}
