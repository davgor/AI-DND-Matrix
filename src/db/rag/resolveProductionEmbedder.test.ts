import { describe, expect, it, vi } from 'vitest'
import type { RagEmbedderSettings } from '../../shared/rag/embedderSettings'
import { DEFAULT_RAG_EMBEDDER_SETTINGS } from '../../shared/rag/embedderSettings'
import { createFakeEmbedder } from './fakeEmbedder'
import { createLexicalEmbedder } from './localEmbedder'
import { resolveProductionEmbedder } from './resolveProductionEmbedder'
import type { Embedder } from './types'

function settings(patch: Partial<RagEmbedderSettings>): RagEmbedderSettings {
  return { ...DEFAULT_RAG_EMBEDDER_SETTINGS, ...patch }
}

describe('resolveProductionEmbedder lexical paths', () => {
  it('returns lexical when mode is lexical', async () => {
    const embedder = await resolveProductionEmbedder({
      settings: settings({ mode: 'lexical', enabled: true }),
      keys: { openaiApiKeySet: false, geminiApiKeySet: false }
    })
    expect(embedder.name).toBe('lexical')
  })

  it('falls back to lexical when local_neural is not ready', async () => {
    const embedder = await resolveProductionEmbedder({
      settings: settings({
        mode: 'local_neural',
        enabled: true,
        localDownloadState: 'idle',
        localModelPath: ''
      }),
      keys: { openaiApiKeySet: false, geminiApiKeySet: false }
    })
    expect(embedder.name).toBe('lexical')
  })

  it('falls back to lexical when cloud key missing', async () => {
    const embedder = await resolveProductionEmbedder({
      settings: settings({ mode: 'openai', enabled: true }),
      keys: { openaiApiKeySet: false, geminiApiKeySet: false },
      openaiApiKey: '',
      geminiApiKey: ''
    })
    expect(embedder.name).toBe('lexical')
  })
})

describe('resolveProductionEmbedder ready factories', () => {
  it('prefers ready local neural when mode is local_neural', async () => {
    const neural = createFakeEmbedder()
    const createNeural = vi.fn(async (): Promise<Embedder> => ({
      name: 'local_neural',
      dimension: 384,
      modelId: 'all-MiniLM-L6-v2',
      embed: neural.embed.bind(neural)
    }))

    const embedder = await resolveProductionEmbedder({
      settings: settings({
        mode: 'local_neural',
        enabled: true,
        localDownloadState: 'ready',
        localModelPath: '/models/minilm'
      }),
      keys: { openaiApiKeySet: false, geminiApiKeySet: false },
      createLocalNeural: createNeural
    })

    expect(embedder.name).toBe('local_neural')
    expect(createNeural).toHaveBeenCalledWith('/models/minilm')
  })

  it('uses openai factory when ready', async () => {
    const createOpenAI = vi.fn(async (): Promise<Embedder> => createLexicalEmbedder())
    await resolveProductionEmbedder({
      settings: settings({ mode: 'openai', enabled: true }),
      keys: { openaiApiKeySet: true, geminiApiKeySet: false },
      openaiApiKey: 'sk-test',
      createOpenAI
    })
    expect(createOpenAI).toHaveBeenCalled()
  })
})
