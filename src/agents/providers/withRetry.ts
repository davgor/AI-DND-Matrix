import { isTruncationError } from './tokenEscalation'
import type { GenerateContext, Provider } from './types'

export interface RetryLogger {
  error(message: string): void
}

export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
}

export const defaultRetryOptions: RetryOptions = { maxAttempts: 3, baseDelayMs: 50 }

export class ProviderUnreachableError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function attemptOnce(
  provider: Provider,
  prompt: string,
  context: GenerateContext | undefined
): Promise<string | Error> {
  try {
    return await provider.generate(prompt, context)
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error))
  }
}

export function withRetry(
  provider: Provider,
  logger?: RetryLogger,
  options: RetryOptions = defaultRetryOptions
): Provider {
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      let lastError: Error | undefined

      for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
        const result = await attemptOnce(provider, prompt, context)
        if (typeof result === 'string') {
          return result
        }
        // 040.14: truncation is not a connectivity failure — retrying the same
        // cap fails deterministically, so surface it for withTokenEscalation.
        if (isTruncationError(result)) {
          throw result
        }
        lastError = result
        if (attempt < options.maxAttempts) {
          await delay(options.baseDelayMs * attempt)
        }
      }

      const message = `Provider unreachable after ${options.maxAttempts} attempts: ${lastError?.message ?? 'unknown error'}`
      logger?.error(message)
      throw new ProviderUnreachableError(message)
    }
  }
}
