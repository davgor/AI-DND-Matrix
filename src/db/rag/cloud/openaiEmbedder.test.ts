import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OpenAIEmbedderConfigError,
  OpenAIEmbedderRequestError,
  createOpenAIEmbedder,
  type FetchLike
} from './openaiEmbedder'

const OPENAI_DIMENSION = 1536

type FetchMock = FetchLike & ReturnType<typeof vi.fn>

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

describe('createOpenAIEmbedder response mapping', () => {
  let fetchImpl: FetchMock

  beforeEach(() => {
    fetchImpl = createFetchMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps a successful response to vectors of the correct dimension', async () => {
    const vectorA = makeVector(OPENAI_DIMENSION, 0.1)
    const vectorB = makeVector(OPENAI_DIMENSION, 0.2)
    fetchImpl.mockResolvedValue(
      jsonResponse({
        data: [
          { index: 0, embedding: vectorA },
          { index: 1, embedding: vectorB }
        ]
      })
    )

    const embedder = createOpenAIEmbedder({ apiKey: 'sk-test', fetchImpl })
    expect(embedder.name).toBe('openai')
    expect(embedder.dimension).toBe(OPENAI_DIMENSION)
    expect(embedder.modelId).toBe('text-embedding-3-small')

    const vectors = await embedder.embed(['hello', 'world'])
    expect(vectors).toEqual([vectorA, vectorB])

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/embeddings')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ authorization: 'Bearer sk-test' })
    const body = JSON.parse(init?.body as string)
    expect(body.model).toBe('text-embedding-3-small')
    expect(body.input).toEqual(['hello', 'world'])
  })
})

describe('createOpenAIEmbedder options', () => {
  let fetchImpl: FetchMock

  beforeEach(() => {
    fetchImpl = createFetchMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses a custom baseUrl and model when provided', async () => {
    fetchImpl.mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: makeVector(OPENAI_DIMENSION) }] })
    )

    const embedder = createOpenAIEmbedder({
      apiKey: 'sk-test',
      model: 'text-embedding-3-large',
      baseUrl: 'https://proxy.example/v1',
      fetchImpl
    })
    expect(embedder.modelId).toBe('text-embedding-3-large')

    await embedder.embed(['one'])
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://proxy.example/v1/embeddings')
    expect(JSON.parse(init?.body as string).model).toBe('text-embedding-3-large')
  })
})

describe('createOpenAIEmbedder errors', () => {
  let fetchImpl: FetchMock

  beforeEach(() => {
    fetchImpl = createFetchMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws a typed request error on auth failure without leaking the API key', async () => {
    fetchImpl.mockResolvedValue(jsonResponse({ error: { message: 'invalid key' } }, 401))
    const embedder = createOpenAIEmbedder({ apiKey: 'sk-super-secret', fetchImpl })

    await expect(embedder.embed(['hello'])).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(OpenAIEmbedderRequestError)
      expect((error as OpenAIEmbedderRequestError).status).toBe(401)
      expect((error as OpenAIEmbedderRequestError).message).not.toContain('sk-super-secret')
      return true
    })
  })

  it('throws a clear error when fetch throws a network failure', async () => {
    fetchImpl.mockRejectedValue(new TypeError('fetch failed'))
    const embedder = createOpenAIEmbedder({ apiKey: 'sk-test', fetchImpl })

    await expect(embedder.embed(['hello'])).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toMatch(/network|fetch failed/i)
      return true
    })
  })

  it('throws when a returned vector has the wrong dimension', async () => {
    fetchImpl.mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }] })
    )
    const embedder = createOpenAIEmbedder({ apiKey: 'sk-test', fetchImpl })

    await expect(embedder.embed(['hello'])).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toMatch(/dimension|length|1536/i)
      return true
    })
  })

  it('throws a config error when apiKey is empty on create', () => {
    expect(() => createOpenAIEmbedder({ apiKey: '', fetchImpl })).toThrow(OpenAIEmbedderConfigError)
  })

  it('throws a config error when apiKey is whitespace on create', () => {
    expect(() => createOpenAIEmbedder({ apiKey: '   ', fetchImpl })).toThrow(OpenAIEmbedderConfigError)
  })
})
