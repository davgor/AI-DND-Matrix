/**
 * Image provider Settings — portable types (epic 152). Independent of LLM mode.
 */
import { IMAGE_LOCAL_REFERENCE_MODEL_ID } from './imageLocalCatalog'

export type ImageProviderMode = 'openai' | 'gemini' | 'grok' | 'player2' | 'local'
export type ImageLocalDownloadState = 'idle' | 'downloading' | 'ready' | 'failed'

export interface ImageProviderSettings {
  enabled: boolean
  mode: ImageProviderMode
  openaiImageModel: string
  geminiImageModel: string
  grokImageModel: string
  player2BaseUrl: string
  localBaseUrl: string
  localCatalogModelId: string
  localDownloadState: ImageLocalDownloadState
  localModelPath: string
  localStartMode: 'managed' | 'attach'
  localServerPath: string
  postLocalLlmPromptDeclined: boolean
}

export const DEFAULT_IMAGE_PROVIDER_SETTINGS: ImageProviderSettings = {
  enabled: false,
  mode: 'openai',
  openaiImageModel: 'gpt-image-1',
  geminiImageModel: 'imagen-3.0-generate-002',
  grokImageModel: 'grok-2-image',
  player2BaseUrl: 'http://127.0.0.1:4315',
  localBaseUrl: 'http://127.0.0.1:8190',
  localCatalogModelId: IMAGE_LOCAL_REFERENCE_MODEL_ID,
  localDownloadState: 'idle',
  localModelPath: '',
  localStartMode: 'managed',
  localServerPath: '',
  postLocalLlmPromptDeclined: false
}

export type ImageGenerationReadyReason =
  | 'ready'
  | 'disabled'
  | 'cloud_needs_key'
  | 'local_needs_download'
  | 'local_needs_runtime'
  | 'player2_needs_url'
  | 'unsupported_mode'

export interface ImageGenerationReadiness {
  ready: boolean
  reason: ImageGenerationReadyReason
}

export interface ImageProviderKeyFlags {
  openaiApiKeySet: boolean
  geminiApiKeySet: boolean
  grokApiKeySet: boolean
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function cloudImageReadiness(keySet: boolean, model: string): ImageGenerationReadiness {
  return keySet && model.trim()
    ? { ready: true, reason: 'ready' }
    : { ready: false, reason: 'cloud_needs_key' }
}

function localImageReadiness(settings: ImageProviderSettings): ImageGenerationReadiness {
  if (settings.localDownloadState !== 'ready' || !settings.localModelPath.trim()) {
    return { ready: false, reason: 'local_needs_download' }
  }
  if (settings.localStartMode === 'managed' && !settings.localServerPath.trim()) {
    return { ready: false, reason: 'local_needs_runtime' }
  }
  return { ready: true, reason: 'ready' }
}

function readinessForMode(
  settings: ImageProviderSettings,
  keys: ImageProviderKeyFlags
): ImageGenerationReadiness {
  switch (settings.mode) {
    case 'openai':
      return cloudImageReadiness(keys.openaiApiKeySet, settings.openaiImageModel)
    case 'gemini':
      return cloudImageReadiness(keys.geminiApiKeySet, settings.geminiImageModel)
    case 'grok':
      return cloudImageReadiness(keys.grokApiKeySet, settings.grokImageModel)
    case 'player2':
      return isValidUrl(settings.player2BaseUrl)
        ? { ready: true, reason: 'ready' }
        : { ready: false, reason: 'player2_needs_url' }
    case 'local':
      return localImageReadiness(settings)
    default:
      return { ready: false, reason: 'unsupported_mode' }
  }
}

export function isImageGenerationReady(
  settings: ImageProviderSettings,
  keys: ImageProviderKeyFlags
): ImageGenerationReadiness {
  if (!settings.enabled) {
    return { ready: false, reason: 'disabled' }
  }
  return readinessForMode(settings, keys)
}

export const IMAGE_GENERATION_NOT_READY_MESSAGE =
  'Enable a ready image provider in Settings before using generative tokens or portraits.'
