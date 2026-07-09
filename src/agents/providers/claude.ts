import type { GenerateContext, Provider } from './types'

export class ClaudeConfigError extends Error {}

export class ClaudeRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

/**
 * 040.1: thrown when the response hit the max_tokens cap (stop_reason
 * "max_tokens"). Returning the partial text instead would let single-shot
 * callers with raw-text fallbacks (narrate, generateNpcReaction) persist a
 * truncated JSON fragment permanently, and schema-retry loops would retry the
 * identical prompt with the identical cap — failing deterministically. Failing
 * loudly here turns a silent corruption bug into a visible error.
 */
export class ClaudeTruncationError extends ClaudeRequestError {}

export interface ClaudeAdapterConfig {
  apiKey: string | undefined
  model: string
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_MAX_TOKENS = 1024

interface AnthropicContentBlock {
  type: string
  text?: string
}

interface AnthropicMessagesResponse {
  content: AnthropicContentBlock[]
  stop_reason?: string
}

async function callAnthropic(
  config: ClaudeAdapterConfig,
  prompt: string,
  context?: GenerateContext
): Promise<Response> {
  try {
    return await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey ?? '',
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: context?.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: context?.systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    })
  } catch (error) {
    throw new ClaudeRequestError(`Claude request failed: ${(error as Error).message}`)
  }
}

export function createClaudeProvider(config: ClaudeAdapterConfig): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      if (!config.apiKey) {
        throw new ClaudeConfigError('CLAUDE_API_KEY is not configured')
      }

      const response = await callAnthropic(config, prompt, context)
      if (!response.ok) {
        throw new ClaudeRequestError(`Claude API returned status ${response.status}`, response.status)
      }

      const data = (await response.json()) as AnthropicMessagesResponse
      if (data.stop_reason === 'max_tokens') {
        throw new ClaudeTruncationError(
          'Claude response was truncated at the max_tokens cap — partial output discarded'
        )
      }
      const textBlock = data.content.find((block) => block.type === 'text')
      return textBlock?.text ?? ''
    }
  }
}
