import { useEffect, useState } from 'react'
import {
  DEFAULT_IMAGE_PROVIDER_SETTINGS,
  isImageGenerationReady,
  type ImageGenerationReadiness
} from '../../../shared/settings/imageProviderSettings'
import type { ImageProviderSettings } from '../../../shared/settings/types'

interface ImageGenerationReadinessState extends ImageGenerationReadiness {
  loading: boolean
}

interface RedactedImageReadinessSnapshot {
  imageGeneration: ImageProviderSettings
  openaiApiKeySet: boolean
  geminiApiKeySet: boolean
  grokApiKeySet: boolean
}

type ImageReadinessSettingsGetter = () => Promise<RedactedImageReadinessSnapshot>

async function defaultSettingsGetter(): Promise<RedactedImageReadinessSnapshot> {
  try {
    if (typeof window !== 'undefined' && window.settings?.get) {
      return (await window.settings.get()) as RedactedImageReadinessSnapshot
    }
  } catch {
    /* tests / non-Electron */
  }
  return {
    imageGeneration: { ...DEFAULT_IMAGE_PROVIDER_SETTINGS },
    openaiApiKeySet: false,
    geminiApiKeySet: false,
    grokApiKeySet: false
  }
}

export function useImageGenerationReadiness(
  getSettings: ImageReadinessSettingsGetter = defaultSettingsGetter
): ImageGenerationReadinessState {
  const [loading, setLoading] = useState(true)
  const [readiness, setReadiness] = useState<ImageGenerationReadiness>({
    ready: false,
    reason: 'disabled'
  })

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      setLoading(true)
      try {
        const snapshot = await getSettings()
        const next = isImageGenerationReady(snapshot.imageGeneration, {
          openaiApiKeySet: snapshot.openaiApiKeySet,
          geminiApiKeySet: snapshot.geminiApiKeySet,
          grokApiKeySet: snapshot.grokApiKeySet
        })
        if (!cancelled) {
          setReadiness(next)
        }
      } catch {
        if (!cancelled) {
          setReadiness({ ready: false, reason: 'disabled' })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [getSettings])

  return { ...readiness, loading }
}
