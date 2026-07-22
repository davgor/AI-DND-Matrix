import type { Provider } from './types'
import {
  OpenAiChatCompletionsRequestError,
  OpenAiChatCompletionsUnreachableError,
  createOpenAiChatCompletionsProvider
} from './openaiChatCompletions'

export class Player2RequestError extends OpenAiChatCompletionsRequestError {}
export class Player2UnreachableError extends OpenAiChatCompletionsUnreachableError {}

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

interface Player2AdapterConfig {
  baseUrl: string
}

const DEFAULT_PLAYER2_MODEL_ID = 'player2'

export function createPlayer2Provider(config: Player2AdapterConfig): Provider {
  return createOpenAiChatCompletionsProvider({
    baseUrl: config.baseUrl,
    defaultModelId: DEFAULT_PLAYER2_MODEL_ID,
    providerLabel: 'Player2',
    requireContent: false,
    errors: {
      unreachable: (message) => new Player2UnreachableError(message),
      request: (message, status) => new Player2RequestError(message, status),
      truncation: (message) => new Player2TruncationError(message),
      parse: (message) => new Player2RequestError(message)
    }
  })
}
