import { DEFAULT_PROVIDER_SETTINGS, isImageGenerationReady, type ProviderSettings } from '../shared/settings/types'
import { createOpenAiImageProvider } from '../shared/imageGeneration/providers/openaiImageProvider'
import { createGeminiImageProvider } from '../shared/imageGeneration/providers/geminiImageProvider'
import { createGrokImageProvider } from '../shared/imageGeneration/providers/grokImageProvider'
import { createPlayer2ImageProvider } from '../shared/imageGeneration/providers/player2ImageProvider'
import type { ImageProvider } from '../shared/imageGeneration'
import { createElectronSecretCodec, getSettingsFilePath, loadSettings } from './settingsStore'
import { createLocalImageProvider } from './imagegen/localImageProvider'

interface ResolvedImageProvider { provider: ImageProvider; ready: true }

interface SchedulerImageProviderBinding {
  imageProvider: ImageProvider
  imageProviderReady: boolean
}

function resolveSchedulerImageProvider(
  injected: ImageProvider | undefined,
  overrideReady: boolean | undefined,
  fallback: ImageProvider
): SchedulerImageProviderBinding {
  const fromDisk = injected === undefined ? loadResolvedImageProviderFromDisk() : null
  return {
    imageProvider: injected ?? fromDisk?.provider ?? fallback,
    imageProviderReady: overrideReady ?? (injected !== undefined || fromDisk != null)
  }
}

export function mergeSchedulerDeps<T extends SchedulerImageProviderBinding>(
  overrides: Partial<T> | undefined,
  fallbackProvider: ImageProvider,
  defaults: T
): T {
  const binding = resolveSchedulerImageProvider(
    overrides?.imageProvider,
    overrides?.imageProviderReady,
    fallbackProvider
  )
  return { ...defaults, ...overrides, ...binding }
}

function buildImageProvider(settings: ProviderSettings): ImageProvider {
  const image = settings.imageGeneration
  if (image.mode === 'openai') return createOpenAiImageProvider({ apiKey: settings.openaiApiKey, model: image.openaiImageModel })
  if (image.mode === 'gemini') return createGeminiImageProvider({ apiKey: settings.geminiApiKey, model: image.geminiImageModel })
  if (image.mode === 'grok') return createGrokImageProvider({ apiKey: settings.grokApiKey, model: image.grokImageModel })
  if (image.mode === 'player2') return createPlayer2ImageProvider({ baseUrl: image.player2BaseUrl })
  return createLocalImageProvider({ baseUrl: image.localBaseUrl })
}

export function resolveImageProviderFromSettings(settings: ProviderSettings): ResolvedImageProvider | null {
  const keys = { openaiApiKeySet: settings.openaiApiKey.trim().length > 0, geminiApiKeySet: settings.geminiApiKey.trim().length > 0, grokApiKeySet: settings.grokApiKey.trim().length > 0 }
  if (!isImageGenerationReady(settings.imageGeneration, keys).ready) return null
  return { provider: buildImageProvider(settings), ready: true }
}

function loadResolvedImageProviderFromDisk(): ResolvedImageProvider | null {
  try {
    return resolveImageProviderFromSettings(loadSettings(getSettingsFilePath(), createElectronSecretCodec(), DEFAULT_PROVIDER_SETTINGS))
  } catch { return null }
}
