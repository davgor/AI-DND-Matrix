import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RAG_EMBEDDER_SETTINGS,
  isRagEmbedderReady,
  type RagEmbedderSettings
} from './embedderSettings'

describe('isRagEmbedderReady disabled and lexical', () => {
  it('is not ready when disabled', () => {
    expect(
      isRagEmbedderReady(DEFAULT_RAG_EMBEDDER_SETTINGS, {
        openaiApiKeySet: true,
        geminiApiKeySet: true
      })
    ).toEqual({ ready: false, reason: 'disabled' })
  })

  it('lexical mode is ready when enabled', () => {
    const settings: RagEmbedderSettings = {
      ...DEFAULT_RAG_EMBEDDER_SETTINGS,
      enabled: true,
      mode: 'lexical'
    }
    expect(
      isRagEmbedderReady(settings, { openaiApiKeySet: false, geminiApiKeySet: false })
    ).toEqual({ ready: true, reason: 'ready' })
  })
})

describe('isRagEmbedderReady local and cloud', () => {
  it('local_neural needs download ready + path', () => {
    const settings: RagEmbedderSettings = {
      ...DEFAULT_RAG_EMBEDDER_SETTINGS,
      enabled: true,
      mode: 'local_neural',
      localDownloadState: 'idle',
      localModelPath: ''
    }
    expect(
      isRagEmbedderReady(settings, { openaiApiKeySet: false, geminiApiKeySet: false })
    ).toEqual({ ready: false, reason: 'local_needs_download' })
  })

  it('openai needs key', () => {
    const settings: RagEmbedderSettings = {
      ...DEFAULT_RAG_EMBEDDER_SETTINGS,
      enabled: true,
      mode: 'openai'
    }
    expect(
      isRagEmbedderReady(settings, { openaiApiKeySet: false, geminiApiKeySet: true })
    ).toEqual({ ready: false, reason: 'cloud_needs_key' })
    expect(
      isRagEmbedderReady(settings, { openaiApiKeySet: true, geminiApiKeySet: false })
    ).toEqual({ ready: true, reason: 'ready' })
  })

  it('gemini needs key', () => {
    const settings: RagEmbedderSettings = {
      ...DEFAULT_RAG_EMBEDDER_SETTINGS,
      enabled: true,
      mode: 'gemini'
    }
    expect(
      isRagEmbedderReady(settings, { openaiApiKeySet: true, geminiApiKeySet: false })
    ).toEqual({ ready: false, reason: 'cloud_needs_key' })
  })
})
