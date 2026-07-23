import type { Embedder } from '../types'

export const OPENAI_EMBEDDING_DIMENSION = 1536
export const OPENAI_DEFAULT_MODEL = 'text-embedding-3-small'
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

export class OpenAIEmbedderConfigError extends Error {}

export class OpenAIEmbedderRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface OpenAIEmbedderOptions {
  apiKey: string
  model?: string
  fetchImpl?: FetchLike
  baseUrl?: string
}

interface OpenAIEmbeddingItem {
  index: number
  embedding: number[]
}

interface OpenAIEmbeddingsResponse {
  data?: OpenAIEmbeddingItem[]
}

function assertApiKey(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (!trimmed) {
    throw new OpenAIEmbedderConfigError('OpenAI embedder requires a non-empty apiKey')
  }
  return trimmed
}

function assertVectorDimension(vector: number[], expectedDimension: number, index: number): void {
  if (vector.length !== expectedDimension) {
    throw new Error(
      `OpenAI embedding at index ${index} has length ${vector.length}; expected ${expectedDimension}`
    )
  }
}

function mapOpenAIResponse(data: OpenAIEmbeddingsResponse, dimension: number): number[][] {
  const items = data.data ?? []
  const sorted = [...items].sort((left, right) => left.index - right.index)
  return sorted.map((item) => {
    assertVectorDimension(item.embedding, dimension, item.index)
    return [...item.embedding]
  })
}

async function parseOpenAIResponse(response: Response, dimension: number): Promise<number[][]> {
  if (!response.ok) {
    throw new OpenAIEmbedderRequestError(
      `OpenAI embeddings request failed with status ${response.status}`,
      response.status
    )
  }
  const data = (await response.json()) as OpenAIEmbeddingsResponse
  return mapOpenAIResponse(data, dimension)
}

async function postOpenAIEmbeddings(
  fetchImpl: FetchLike,
  url: string,
  apiKey: string,
  body: string
): Promise<Response> {
  try {
    return await fetchImpl(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`OpenAI embeddings network error: ${message}`)
  }
}

export function createOpenAIEmbedder(options: OpenAIEmbedderOptions): Embedder {
  const apiKey = assertApiKey(options.apiKey)
  const model = options.model ?? OPENAI_DEFAULT_MODEL
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  const fetchImpl: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis)

  return {
    name: 'openai',
    dimension: OPENAI_EMBEDDING_DIMENSION,
    modelId: model,
    async embed(texts: string[]): Promise<number[][]> {
      const response = await postOpenAIEmbeddings(
        fetchImpl,
        `${baseUrl}/embeddings`,
        apiKey,
        JSON.stringify({ model, input: texts })
      )
      return parseOpenAIResponse(response, OPENAI_EMBEDDING_DIMENSION)
    }
  }
}
