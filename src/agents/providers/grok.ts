/**
 * xAI Grok adapter (OpenAI-compatible chat completions).
 * Curated model ids (also in modelCatalogs): mid-tier `grok-3`; flagship class `grok-4`, `grok-4.5`.
 */
import type { GenerateContext, Provider } from './types'
import { parseOpenAiCompatibleUsage } from './usageParse'
import { isTruncationError } from './tokenEscalation'

export class GrokConfigError extends Error {}

export class GrokRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export class GrokTruncationError extends GrokRequestError {
  readonly isProviderTruncation = true
}

interface GrokAdapterConfig {
  apiKey: string | undefined
  model: string
  baseUrl?: string
}

const DEFAULT_GROK_BASE_URL = 'https://api.x.ai'
const DEFAULT_MAX_TOKENS = 1024

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatChoice {
  message: { role: string; content: string }
  finish_reason?: string
}

interface ChatCompletionResponse {
  choices: ChatChoice[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

function buildMessages(prompt: string, context?: GenerateContext): ChatMessage[] {
  const messages: ChatMessage[] = []
  if (context?.systemPrompt) {
    messages.push({ role: 'system', content: context.systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })
  return messages
}

function resolveBaseUrl(config: GrokAdapterConfig): string {
  return (config.baseUrl ?? DEFAULT_GROK_BASE_URL).replace(/\/$/, '')
}

async function callGrok(
  config: GrokAdapterConfig,
  prompt: string,
  context?: GenerateContext
): Promise<Response> {
  const url = `${resolveBaseUrl(config)}/v1/chat/completions`
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey ?? ''}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: buildMessages(prompt, context),
        max_tokens: context?.maxTokens ?? DEFAULT_MAX_TOKENS
      })
    })
  } catch (error) {
    throw new GrokRequestError(`Grok request failed: ${(error as Error).message}`)
  }
}

export function createGrokProvider(config: GrokAdapterConfig): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      if (!config.apiKey) {
        throw new GrokConfigError('Grok API key is not configured')
      }

      const response = await callGrok(config, prompt, context)
      if (!response.ok) {
        throw new GrokRequestError(`Grok API returned status ${response.status}`, response.status)
      }

      const data = (await response.json()) as ChatCompletionResponse
      const choice = data.choices[0]
      if (choice?.finish_reason === 'length') {
        throw new GrokTruncationError(
          'Grok response was truncated at the max_tokens cap — partial output discarded'
        )
      }
      const text = choice?.message.content ?? ''
      context?.onUsage?.(parseOpenAiCompatibleUsage(data.usage, config.model))
      return text
    }
  }
}

export async function testGrokConnection(
  apiKey: string,
  model: string,
  baseUrl?: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const provider = createGrokProvider({ apiKey, model, baseUrl })
    await provider.generate('ping', { maxTokens: 1, purpose: 'system.ping' })
    return { ok: true, message: 'Connected to Grok successfully.' }
  } catch (error) {
    if (isTruncationError(error)) {
      return { ok: true, message: 'Connected to Grok successfully.' }
    }
    return { ok: false, message: `Could not reach Grok: ${(error as Error).message}` }
  }
}
