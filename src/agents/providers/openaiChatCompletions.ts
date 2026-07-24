import type { GenerateContext, Provider } from './types'
import { parseOpenAiCompatibleUsage } from './usageParse'

export class OpenAiChatCompletionsRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export class OpenAiChatCompletionsUnreachableError extends Error {}

export class OpenAiChatCompletionsParseError extends Error {}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatChoice {
  message?: { role?: string; content?: string }
  finish_reason?: string
}

interface ChatCompletionResponse {
  choices?: ChatChoice[]
  model?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

interface OpenAiChatCompletionsErrorFactories {
  unreachable: (message: string) => Error
  request: (message: string, status?: number) => Error
  truncation: (message: string) => Error
  parse: (message: string) => Error
}

interface OpenAiChatCompletionsProviderConfig {
  baseUrl: string
  defaultModelId: string
  providerLabel: string
  errors: OpenAiChatCompletionsErrorFactories
  /** When true, missing/empty assistant content is a typed parse error. */
  requireContent: boolean
}

function buildMessages(prompt: string, context?: GenerateContext): ChatMessage[] {
  const messages: ChatMessage[] = []
  if (context?.systemPrompt) {
    messages.push({ role: 'system', content: context.systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })
  return messages
}

async function postChatCompletions(
  config: OpenAiChatCompletionsProviderConfig,
  prompt: string,
  context?: GenerateContext
): Promise<Response> {
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
    throw config.errors.unreachable(
      `${config.providerLabel} request failed: ${(error as Error).message}`
    )
  }
}

function readAssistantContent(
  config: OpenAiChatCompletionsProviderConfig,
  data: ChatCompletionResponse
): { text: string; finishReason: string | undefined } {
  const choice = data.choices?.[0]
  const text = choice?.message?.content
  if (config.requireContent && (typeof text !== 'string' || text.length === 0)) {
    throw config.errors.parse(`${config.providerLabel} response missing assistant content`)
  }
  return { text: text ?? '', finishReason: choice?.finish_reason }
}

export function createOpenAiChatCompletionsProvider(
  config: OpenAiChatCompletionsProviderConfig
): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      const response = await postChatCompletions(config, prompt, context)
      if (!response.ok) {
        throw config.errors.request(
          `${config.providerLabel} API returned status ${response.status}`,
          response.status
        )
      }

      let data: ChatCompletionResponse
      try {
        data = (await response.json()) as ChatCompletionResponse
      } catch {
        throw config.errors.parse(`${config.providerLabel} response was not valid JSON`)
      }

      const { text, finishReason } = readAssistantContent(config, data)
      if (finishReason === 'length') {
        throw config.errors.truncation(
          `${config.providerLabel} response was truncated at the max_tokens cap — partial output discarded`
        )
      }

      const modelId = data.model ?? config.defaultModelId
      context?.onUsage?.(parseOpenAiCompatibleUsage(data.usage, modelId))
      return text
    }
  }
}
