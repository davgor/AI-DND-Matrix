import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GeminiEmbedderConfigError,
  GeminiEmbedderRequestError,
  createGeminiEmbedder
} from './geminiEmbedder'

const GEMINI_DIMENSION = 768

type FetchMock = typeof fetch & ReturnType<typeof vi.fn>

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

function makeVector(dimension: number, seed = 0.01): number[] {
  return Array.from({ length: dimension }, (_, index) => seed + index * 0.001)
}

function createFetchMock(): FetchMock {
  return vi.fn() as unknown as FetchMock
}

describe('createGeminiEmbedder batch', () => {
  let fetchImpl: FetchMock

  beforeEach(() => {
    fetchImpl = createFetchMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps a successful batch response to vectors of the correct dimension', async () => {
    const vectorA = makeVector(GEMINI_DIMENSION, 0.1)
    const vectorB = makeVector(GEMINI_DIMENSION, 0.2)
    fetchImpl.mockResolvedValue(
      jsonResponse({
        embeddings: [{ values: vectorA }, { values: vectorB }]
      })
    )

    const embedder = createGeminiEmbedder({ apiKey: 'gem-test', fetchImpl })
    expect(embedder.name).toBe('gemini')
    expect(embedder.dimension).toBe(GEMINI_DIMENSION)
    expect(embedder.modelId).toBe('text-embedding-004')

    const vectors = await embedder.embed(['hello', 'world'])
    expect(vectors).toEqual([vectorA, vectorB])

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toContain('text-embedding-004:batchEmbedContents')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'gem-test' })
  })
})

describe('createGeminiEmbedder single', () => {
  let fetchImpl: FetchMock

  beforeEach(() => {
    fetchImpl = createFetchMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses embedContent for a single text input', async () => {
    const vector = makeVector(GEMINI_DIMENSION)
    fetchImpl.mockResolvedValue(jsonResponse({ embedding: { values: vector } }))

    const embedder = createGeminiEmbedder({ apiKey: 'gem-test', fetchImpl })
    const vectors = await embedder.embed(['solo'])

    expect(vectors).toEqual([vector])
    const [url] = fetchImpl.mock.calls[0]
    expect(url).toContain('text-embedding-004:embedContent')
    expect(url).not.toContain('batchEmbedContents')
  })

  it('uses a custom model when provided', async () => {
    fetchImpl.mockResolvedValue(
      jsonResponse({ embedding: { values: makeVector(GEMINI_DIMENSION) } })
    )

    const embedder = createGeminiEmbedder({
      apiKey: 'gem-test',
      model: 'text-embedding-004',
      fetchImpl
    })
    expect(embedder.modelId).toBe('text-embedding-004')

    await embedder.embed(['one'])
    const [url] = fetchImpl.mock.calls[0]
    expect(url).toContain('text-embedding-004:embedContent')
  })
})

describe('createGeminiEmbedder request errors', () => {
  let fetchImpl: FetchMock

  beforeEach(() => {
    fetchImpl = createFetchMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws a typed request error on auth failure without leaking the API key', async () => {
    fetchImpl.mockResolvedValue(jsonResponse({ error: { message: 'invalid key' } }, 401))
    const embedder = createGeminiEmbedder({ apiKey: 'gem-super-secret', fetchImpl })

    await expect(embedder.embed(['hello'])).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(GeminiEmbedderRequestError)
      expect((error as GeminiEmbedderRequestError).status).toBe(401)
      expect((error as GeminiEmbedderRequestError).message).not.toContain('gem-super-secret')
      return true
    })
  })

  it('throws a clear error when fetch throws a network failure', async () => {
    fetchImpl.mockRejectedValue(new TypeError('fetch failed'))
    const embedder = createGeminiEmbedder({ apiKey: 'gem-test', fetchImpl })

    await expect(embedder.embed(['hello'])).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toMatch(/network|fetch failed/i)
      return true
    })
  })

  it('throws when a returned vector has the wrong dimension', async () => {
    fetchImpl.mockResolvedValue(jsonResponse({ embedding: { values: [0.1, 0.2] } }))
    const embedder = createGeminiEmbedder({ apiKey: 'gem-test', fetchImpl })

    await expect(embedder.embed(['hello'])).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toMatch(/dimension|length|768/i)
      return true
    })
  })
})

describe('createGeminiEmbedder config', () => {
  it('throws a config error when apiKey is empty on create', () => {
    expect(() => createGeminiEmbedder({ apiKey: '' })).toThrow(GeminiEmbedderConfigError)
  })

  it('throws a config error when apiKey is whitespace on create', () => {
    expect(() => createGeminiEmbedder({ apiKey: '   ' })).toThrow(GeminiEmbedderConfigError)
  })
})
