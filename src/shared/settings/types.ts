import {
  DEFAULT_RAG_EMBEDDER_SETTINGS,
  type RagEmbedderSettings
} from '../rag/embedderSettings'
import {
  DEFAULT_IMAGE_PROVIDER_SETTINGS,
  type ImageProviderSettings
} from './imageProviderSettings'

export type ProviderMode = 'claude' | 'openai' | 'gemini' | 'grok' | 'player2' | 'llamacpp'

/** Catalog download lifecycle for local llama.cpp models (020.4 / 020.18). */
export type LlamaCppDownloadState = 'idle' | 'downloading' | 'ready' | 'failed'

export type { ImageProviderSettings } from './imageProviderSettings'
export { isImageGenerationReady } from './imageProviderSettings'

export interface ProviderSettings {
  mode: ProviderMode
  claudeApiKey: string
  claudeModel: string
  openaiApiKey: string
  openaiModel: string
  geminiApiKey: string
  geminiModel: string
  grokApiKey: string
  grokModel: string
  llamaCppBaseUrl: string
  llamaCppServerPath: string
  /** Resolved absolute .gguf path (manual BYO or post-download). */
  llamaCppModelPath: string
  llamaCppCtxSize: number
  llamaCppGpuLayers: string
  llamaCppStartMode: 'managed' | 'attach'
  /** Curated catalog entry id; empty when using advanced manual paths only. */
  llamaCppCatalogModelId: string
  llamaCppDownloadState: LlamaCppDownloadState
  /** Official zip backend for Acquire runtime (Vulkan GPU vs CPU). */
  llamaCppRuntimeBackend: 'vulkan' | 'cpu'
  player2BaseUrl: string
  /** Campaign RAG embedder mode / local download (epic 154). */
  ragEmbedder: RagEmbedderSettings
  /** Image generation provider (epic 152) ΓÇö independent of LLM mode. */
  imageGeneration: ImageProviderSettings
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  mode: 'player2',
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-6',
  openaiApiKey: '',
  openaiModel: 'gpt-4.1-mini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  grokApiKey: '',
  grokModel: 'grok-3',
  llamaCppBaseUrl: 'http://127.0.0.1:8080',
  llamaCppServerPath: '',
  llamaCppModelPath: '',
  llamaCppCtxSize: 8192,
  llamaCppGpuLayers: 'all',
  llamaCppStartMode: 'attach',
  llamaCppCatalogModelId: '',
  llamaCppDownloadState: 'idle',
  llamaCppRuntimeBackend: 'vulkan',
  player2BaseUrl: 'http://127.0.0.1:4315',
  ragEmbedder: { ...DEFAULT_RAG_EMBEDDER_SETTINGS },
  imageGeneration: { ...DEFAULT_IMAGE_PROVIDER_SETTINGS }
}

type ProviderApiKeyField = 'claudeApiKey' | 'openaiApiKey' | 'geminiApiKey' | 'grokApiKey'

export interface RedactedProviderSettings
  extends Omit<ProviderSettings, ProviderApiKeyField> {
  claudeApiKeySet: boolean
  openaiApiKeySet: boolean
  geminiApiKeySet: boolean
  grokApiKeySet: boolean
}

export interface SettingsValidationError {
  field: string
  message: string
}

export interface SaveProviderSettingsInput
  extends Omit<ProviderSettings, ProviderApiKeyField> {
  claudeApiKey?: string
  openaiApiKey?: string
  geminiApiKey?: string
  grokApiKey?: string
}

export interface ProviderValidationContext {
  claudeApiKeySet?: boolean
  openaiApiKeySet?: boolean
  geminiApiKeySet?: boolean
  grokApiKeySet?: boolean
}

export interface ConnectionCheckResult {
  ok: boolean
  message: string
}
