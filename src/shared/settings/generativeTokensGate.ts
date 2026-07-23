import {
  IMAGE_GENERATION_NOT_READY_MESSAGE,
  isImageGenerationReady,
  type ImageProviderKeyFlags,
  type ImageProviderSettings
} from './imageProviderSettings'
import type { ProviderSettings } from './types'

function canEnableGenerativeTokens(
  image: ImageProviderSettings,
  keys: ImageProviderKeyFlags
): boolean {
  return isImageGenerationReady(image, keys).ready
}

function providerKeyFlags(settings: ProviderSettings): ImageProviderKeyFlags {
  return {
    openaiApiKeySet: settings.openaiApiKey.trim().length > 0,
    geminiApiKeySet: settings.geminiApiKey.trim().length > 0,
    grokApiKeySet: settings.grokApiKey.trim().length > 0
  }
}

export function isImageProviderReadyForGenerativeTokens(settings: ProviderSettings): boolean {
  return canEnableGenerativeTokens(settings.imageGeneration, providerKeyFlags(settings))
}

export function generativeTokensGuardMessage(): string {
  return IMAGE_GENERATION_NOT_READY_MESSAGE
}
