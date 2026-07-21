import type { GenerateContext, Provider } from './types'
import { parseOpenAiCompatibleUsage } from './usageParse'

export class Player2RequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export class Player2UnreachableError extends Error {}

/**
 * 040.1: same truncation guard as ClaudeTruncationError — Player2's
 * OpenAI-compatible endpoint reports the cutoff as finish_reason "length".
 * Partial text is never returned; callers fail loudly instead of persisting
 * a truncated fragment.
 */
export class Player2TruncationError extends Player2RequestError {
  /** Shared marker read by isTruncationError (040.14) — keep in sync with ClaudeTruncationError. */
  readonly isProviderTruncation = true
}

export interface Player2AdapterConfig {
  baseUrl: string
}

interface Player2ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface Player2ChatChoice {
  message: { role: string; content: string }
  finish_reason?: string
}

interface Player2ChatCompletionResponse {
  choices: Player2ChatChoice[]
  model?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

const DEFAULT_PLAYER2_MODEL_ID = 'player2'

function buildMessages(prompt: string, context?: GenerateContext): Player2ChatMessage[] {
  const messages: Player2ChatMessage[] = []
  if (context?.systemPrompt) {
    messages.push({ role: 'system', content: context.systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })
  return messages
}

async function callPlayer2(config: Player2AdapterConfig, prompt: string, context?: GenerateContext): Promise<Response> {
  try {
    return await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: buildMessages(prompt, context),
        max_tokens: context?.maxTokens
      })
    })
  } catch (error) {
    throw new Player2UnreachableError(`Player2 request failed: ${(error as Error).message}`)
  }
}

export function createPlayer2Provider(config: Player2AdapterConfig): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      const response = await callPlayer2(config, prompt, context)
      if (!response.ok) {
        throw new Player2RequestError(`Player2 API returned status ${response.status}`, response.status)
      }

      const data = (await response.json()) as Player2ChatCompletionResponse
      const choice = data.choices[0]
      if (choice?.finish_reason === 'length') {
        throw new Player2TruncationError(
          'Player2 response was truncated at the max_tokens cap — partial output discarded'
        )
      }
      const text = choice?.message.content ?? ''
      const modelId = data.model ?? DEFAULT_PLAYER2_MODEL_ID
      const usage = parseOpenAiCompatibleUsage(data.usage, modelId)
      context?.onUsage?.(usage)
      return text
    }
  }
}
