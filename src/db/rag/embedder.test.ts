import { describe, expect, it } from 'vitest'
import { createFakeEmbedder } from './fakeEmbedder'
import { createLexicalEmbedder, createLocalEmbedder } from './localEmbedder'
import { selectEmbedder } from './selectEmbedder'
import { EMBEDDING_DIMENSION } from './types'

function l2Norm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
}

describe('selectEmbedder', () => {
  it('defaults to the lexical embedder (legacy local alias)', () => {
    const embedder = selectEmbedder()
    expect(embedder.name).toBe('lexical')
    expect(embedder.dimension).toBe(EMBEDDING_DIMENSION)
    expect(embedder.modelId).toBe('hashed-bow-v1')
  })

  it('selects lexical by name', () => {
    const embedder = selectEmbedder('lexical')
    expect(embedder.name).toBe('lexical')
  })

  it('aliases legacy local name to lexical', () => {
    const embedder = selectEmbedder('local')
    expect(embedder.name).toBe('lexical')
  })

  it('selects the fake embedder for tests', () => {
    const embedder = selectEmbedder('fake')
    expect(embedder.name).toBe('fake')
  })

  it('rejects unknown embedder names clearly', () => {
    expect(() => selectEmbedder('not-a-real-embedder')).toThrow(/Unknown embedder/i)
  })

  it('rejects cloud names without a configured factory (use create*Embedder)', () => {
    expect(() => selectEmbedder('openai')).toThrow(/requires createOpenAIEmbedder|API key|factory/i)
    expect(() => selectEmbedder('gemini')).toThrow(/requires createGeminiEmbedder|API key|factory/i)
  })

  it('reads RAG_EMBEDDER when passed as config name', () => {
    const previous = process.env.RAG_EMBEDDER
    process.env.RAG_EMBEDDER = 'fake'
    try {
      const embedder = selectEmbedder(process.env.RAG_EMBEDDER ?? 'lexical')
      expect(embedder.name).toBe('fake')
    } finally {
      if (previous === undefined) {
        delete process.env.RAG_EMBEDDER
      } else {
        process.env.RAG_EMBEDDER = previous
      }
    }
  })
})

describe('createLexicalEmbedder', () => {
  it('returns fixed-dimension vectors for each input text', async () => {
    const embedder = createLexicalEmbedder()
    const vectors = await embedder.embed(['hello world', 'foo bar'])

    expect(vectors).toHaveLength(2)
    for (const vector of vectors) {
      expect(vector).toHaveLength(EMBEDDING_DIMENSION)
    }
  })

  it('is deterministic for identical text', async () => {
    const embedder = createLexicalEmbedder()
    const first = await embedder.embed(['test text'])
    const second = await embedder.embed(['test text'])

    expect(first).toEqual(second)
  })

  it('returns different vectors for different text', async () => {
    const embedder = createLexicalEmbedder()
    const [hello, goodbye] = await embedder.embed(['hello', 'goodbye'])

    expect(hello).not.toEqual(goodbye)
  })

  it('L2-normalizes non-empty vectors', async () => {
    const embedder = createLexicalEmbedder()
    const [vector] = await embedder.embed(['some text here'])

    expect(l2Norm(vector)).toBeCloseTo(1, 5)
  })
})

describe('createLocalEmbedder (deprecated alias)', () => {
  it('returns the lexical embedder', () => {
    const embedder = createLocalEmbedder()
    expect(embedder.name).toBe('lexical')
  })
})

describe('createFakeEmbedder', () => {
  it('is deterministic from hash when no fixture is provided', async () => {
    const embedder = createFakeEmbedder()
    const first = await embedder.embed(['alpha'])
    const second = await embedder.embed(['alpha'])

    expect(first).toEqual(second)
  })

  it('uses fixture vectors when provided', async () => {
    const fixture = Array.from({ length: EMBEDDING_DIMENSION }, (_, index) => index * 0.001)
    const embedder = createFakeEmbedder({ fixtures: { 'known text': fixture } })
    const [vector] = await embedder.embed(['known text'])

    expect(vector).toEqual(fixture)
  })

  it('tracks callCount across embed invocations', async () => {
    const embedder = createFakeEmbedder()
    expect(embedder.callCount).toBe(0)

    await embedder.embed(['a'])
    expect(embedder.callCount).toBe(1)

    await embedder.embed(['b', 'c'])
    expect(embedder.callCount).toBe(2)
  })

  it('returns fixed-dimension vectors without network access', async () => {
    const embedder = createFakeEmbedder()
    const vectors = await embedder.embed(['offline', 'vectors'])

    expect(vectors).toHaveLength(2)
    for (const vector of vectors) {
      expect(vector).toHaveLength(EMBEDDING_DIMENSION)
    }
  })
})
