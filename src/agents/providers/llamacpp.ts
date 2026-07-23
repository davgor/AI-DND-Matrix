import type { GenerateContext, Provider } from './types'
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

/** Default matches Settings / lifecycle `llamaCppCtxSize`. */
const DEFAULT_LLAMACPP_CTX_SIZE = 8192

/** Floor so connectivity pings and tiny caps still work after clamping. */
const LLAMACPP_MIN_COMPLETION_TOKENS = 256

/**
 * Leave half the ctx window (capped) for the prompt so campaign stages that
 * request max_tokens ≈ ctxSize do not immediately truncate.
 */
export function clampLlamaCompletionMaxTokens(ctxSize: number, requested: number): number {
  const reserve = Math.min(Math.floor(ctxSize / 2), 4096)
  const ceiling = Math.max(LLAMACPP_MIN_COMPLETION_TOKENS, ctxSize - reserve)
  return Math.min(requested, ceiling)
}

interface LlamaCppAdapterConfig {
  baseUrl: string
  /** llama-server `-c` window; used to clamp completion max_tokens. */
  ctxSize?: number
}

const DEFAULT_LLAMACPP_MODEL_ID = 'llamacpp'

export function createLlamaCppProvider(config: LlamaCppAdapterConfig): Provider {
  const ctxSize = config.ctxSize ?? DEFAULT_LLAMACPP_CTX_SIZE
  const inner = createOpenAiChatCompletionsProvider({
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

  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      const maxTokens =
        context?.maxTokens === undefined
          ? undefined
          : clampLlamaCompletionMaxTokens(ctxSize, context.maxTokens)
      return inner.generate(prompt, context ? { ...context, maxTokens } : context)
    }
  }
}
