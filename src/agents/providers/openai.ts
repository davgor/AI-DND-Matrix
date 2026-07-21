import type { GenerateContext, Provider } from './types'
import { parseOpenAiCompatibleUsage } from './usageParse'
import { isTruncationError } from './tokenEscalation'

export class OpenAiConfigError extends Error {}

export class OpenAiRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export class OpenAiTruncationError extends OpenAiRequestError {
  readonly isProviderTruncation = true
}

interface OpenAiAdapterConfig {
  apiKey: string | undefined
  model: string
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
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

async function callOpenAi(
  config: OpenAiAdapterConfig,
  prompt: string,
  context?: GenerateContext
): Promise<Response> {
  try {
    return await fetch(OPENAI_API_URL, {
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
    throw new OpenAiRequestError(`OpenAI request failed: ${(error as Error).message}`)
  }
}

export function createOpenAiProvider(config: OpenAiAdapterConfig): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      if (!config.apiKey) {
        throw new OpenAiConfigError('OpenAI API key is not configured')
      }

      const response = await callOpenAi(config, prompt, context)
      if (!response.ok) {
        throw new OpenAiRequestError(`OpenAI API returned status ${response.status}`, response.status)
      }

      const data = (await response.json()) as ChatCompletionResponse
      const choice = data.choices[0]
      if (choice?.finish_reason === 'length') {
        throw new OpenAiTruncationError(
          'OpenAI response was truncated at the max_tokens cap — partial output discarded'
        )
      }
      const text = choice?.message.content ?? ''
      const usage = parseOpenAiCompatibleUsage(data.usage, config.model)
      context?.onUsage?.(usage)
      return text
    }
  }
}

export async function testOpenAiConnection(
  apiKey: string,
  model: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const provider = createOpenAiProvider({ apiKey, model })
    await provider.generate('ping', { maxTokens: 1, purpose: 'system.ping' })
    return { ok: true, message: 'Connected to OpenAI successfully.' }
  } catch (error) {
    if (isTruncationError(error)) {
      return { ok: true, message: 'Connected to OpenAI successfully.' }
    }
    return { ok: false, message: `Could not reach OpenAI: ${(error as Error).message}` }
  }
}
