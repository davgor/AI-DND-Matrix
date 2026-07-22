import type { Provider } from './types'
import {
  OpenAiChatCompletionsParseError,
  OpenAiChatCompletionsRequestError,
  OpenAiChatCompletionsUnreachableError,
  createOpenAiChatCompletionsProvider
} from './openaiChatCompletions'

export class LlamaCppRequestError extends OpenAiChatCompletionsRequestError {}
export class LlamaCppUnreachableError extends OpenAiChatCompletionsUnreachableError {}
export class LlamaCppParseError extends OpenAiChatCompletionsParseError {}
export class LlamaCppTruncationError extends LlamaCppRequestError {
  readonly isProviderTruncation = true
}

interface LlamaCppAdapterConfig {
  baseUrl: string
}

const DEFAULT_LLAMACPP_MODEL_ID = 'llamacpp'

export function createLlamaCppProvider(config: LlamaCppAdapterConfig): Provider {
  return createOpenAiChatCompletionsProvider({
    baseUrl: config.baseUrl,
    defaultModelId: DEFAULT_LLAMACPP_MODEL_ID,
    providerLabel: 'llama.cpp',
    requireContent: true,
    errors: {
      unreachable: (message) => new LlamaCppUnreachableError(message),
      request: (message, status) => new LlamaCppRequestError(message, status),
      truncation: (message) => new LlamaCppTruncationError(message),
      parse: (message) => new LlamaCppParseError(message)
    }
  })
}
