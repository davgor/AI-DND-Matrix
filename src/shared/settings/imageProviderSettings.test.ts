import { describe, expect, it } from 'vitest'
import { DEFAULT_IMAGE_PROVIDER_SETTINGS, isImageGenerationReady } from './imageProviderSettings'

describe('isImageGenerationReady', () => {
  it('disabled when Enable OFF', () => {
    expect(isImageGenerationReady(DEFAULT_IMAGE_PROVIDER_SETTINGS, {
      openaiApiKeySet: true,
      geminiApiKeySet: true,
      grokApiKeySet: true
    }).reason).toBe('disabled')
  })
})
