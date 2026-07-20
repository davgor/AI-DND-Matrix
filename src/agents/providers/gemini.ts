import type { GenerateContext, Provider } from './types'
import { isTruncationError } from './tokenEscalation'
import type { ProviderUsageSnapshot } from '../../shared/llmUsage'

export class GeminiConfigError extends Error {}

export class GeminiRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export class GeminiTruncationError extends GeminiRequestError {
  readonly isProviderTruncation = true
}

interface GeminiAdapterConfig {
  apiKey: string | undefined
  model: string
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MAX_TOKENS = 1024

interface GeminiPart {
  text?: string
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] }
  finishReason?: string
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
  }
}

function buildRequestBody(prompt: string, context?: GenerateContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: context?.maxTokens ?? DEFAULT_MAX_TOKENS }
  }
  if (context?.systemPrompt) {
    body.system_instruction = { parts: [{ text: context.systemPrompt }] }
  }
  return body
}

function extractText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? []
  return parts.map((part) => part.text ?? '').join('')
}

function parseGeminiUsage(
  usage: GeminiResponse['usageMetadata'],
  modelId: string
): ProviderUsageSnapshot {
  const inputTokens = usage?.promptTokenCount ?? null
  const outputTokens = usage?.candidatesTokenCount ?? null
  const totalTokens =
    inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null
  return { inputTokens, outputTokens, totalTokens, modelId }
}

async function callGemini(
  config: GeminiAdapterConfig,
  prompt: string,
  context?: GenerateContext
): Promise<Response> {
  const url = `${GEMINI_API_BASE}/${config.model}:generateContent`
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': config.apiKey ?? ''
      },
      body: JSON.stringify(buildRequestBody(prompt, context))
    })
  } catch (error) {
    throw new GeminiRequestError(`Gemini request failed: ${(error as Error).message}`)
  }
}

export function createGeminiProvider(config: GeminiAdapterConfig): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      if (!config.apiKey) {
        throw new GeminiConfigError('Gemini API key is not configured')
      }

      const response = await callGemini(config, prompt, context)
      if (!response.ok) {
        throw new GeminiRequestError(`Gemini API returned status ${response.status}`, response.status)
      }

      const data = (await response.json()) as GeminiResponse
      if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        throw new GeminiTruncationError(
          'Gemini response was truncated at the maxOutputTokens cap — partial output discarded'
        )
      }
      const text = extractText(data)
      context?.onUsage?.(parseGeminiUsage(data.usageMetadata, config.model))
      return text
    }
  }
}

export async function testGeminiConnection(
  apiKey: string,
  model: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const provider = createGeminiProvider({ apiKey, model })
    await provider.generate('ping', { maxTokens: 1, purpose: 'system.ping' })
    return { ok: true, message: 'Connected to Gemini successfully.' }
  } catch (error) {
    if (isTruncationError(error)) {
      return { ok: true, message: 'Connected to Gemini successfully.' }
    }
    return { ok: false, message: `Could not reach Gemini: ${(error as Error).message}` }
  }
}
