import type { Embedder } from '../types'

export const GEMINI_EMBEDDING_DIMENSION = 768
export const GEMINI_DEFAULT_MODEL = 'text-embedding-004'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export class GeminiEmbedderConfigError extends Error {}

export class GeminiEmbedderRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export interface GeminiEmbedderOptions {
  apiKey: string
  model?: string
  fetchImpl?: typeof fetch
}

interface GeminiEmbeddingValues {
  values?: number[]
}

interface GeminiEmbedContentResponse {
  embedding?: GeminiEmbeddingValues
}

interface GeminiBatchEmbedContentsResponse {
  embeddings?: GeminiEmbeddingValues[]
}

function assertApiKey(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (!trimmed) {
    throw new GeminiEmbedderConfigError('Gemini embedder requires a non-empty apiKey')
  }
  return trimmed
}

function assertVectorDimension(vector: number[], expectedDimension: number, index: number): void {
  if (vector.length !== expectedDimension) {
    throw new Error(
      `Gemini embedding at index ${index} has length ${vector.length}; expected ${expectedDimension}`
    )
  }
}

function mapGeminiValues(values: number[] | undefined, index: number, dimension: number): number[] {
  const vector = values ?? []
  assertVectorDimension(vector, dimension, index)
  return [...vector]
}

function buildGeminiContent(text: string): Record<string, unknown> {
  return { content: { parts: [{ text }] } }
}

function buildGeminiBatchBody(model: string, texts: string[]): Record<string, unknown> {
  const modelPath = `models/${model}`
  return {
    requests: texts.map((text) => ({
      model: modelPath,
      content: { parts: [{ text }] }
    }))
  }
}

async function parseGeminiResponse(response: Response, dimension: number): Promise<number[][]> {
  if (!response.ok) {
    throw new GeminiEmbedderRequestError(
      `Gemini embeddings request failed with status ${response.status}`,
      response.status
    )
  }
  const data = (await response.json()) as GeminiEmbedContentResponse & GeminiBatchEmbedContentsResponse
  if (data.embeddings) {
    return data.embeddings.map((entry, index) => mapGeminiValues(entry.values, index, dimension))
  }
  return [mapGeminiValues(data.embedding?.values, 0, dimension)]
}

async function callGeminiEmbeddings(
  apiKey: string,
  model: string,
  texts: string[],
  fetchImpl: typeof fetch
): Promise<number[][]> {
  const isBatch = texts.length > 1
  const action = isBatch ? 'batchEmbedContents' : 'embedContent'
  const url = `${GEMINI_API_BASE}/${model}:${action}`
  const body = isBatch ? buildGeminiBatchBody(model, texts) : buildGeminiContent(texts[0] ?? '')

  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(body)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Gemini embeddings network error: ${message}`)
  }
  return parseGeminiResponse(response, GEMINI_EMBEDDING_DIMENSION)
}

export function createGeminiEmbedder(options: GeminiEmbedderOptions): Embedder {
  const apiKey = assertApiKey(options.apiKey)
  const model = options.model ?? GEMINI_DEFAULT_MODEL
  const fetchImpl = options.fetchImpl ?? fetch

  return {
    name: 'gemini',
    dimension: GEMINI_EMBEDDING_DIMENSION,
    modelId: model,
    embed(texts: string[]): Promise<number[][]> {
      return callGeminiEmbeddings(apiKey, model, texts, fetchImpl)
    }
  }
}
