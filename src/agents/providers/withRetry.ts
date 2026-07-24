import { isTruncationError } from './tokenEscalation'
import type { GenerateContext, Provider } from './types'
import { LlamaCppParseError } from './llamacpp'

interface RetryLogger {
  error(message: string): void
}

interface RetryDiagnostics {
  providerName?: string
  hostPort?: string
  lifecycleState?: string
  /** When 'local', exhausted retries throw LlamaCppProviderUnreachableError. */
  errorClassHint?: 'local' | 'generic'
}

export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  diagnostics?: RetryDiagnostics
  shouldRetry?: (error: Error) => boolean
}

const defaultRetryOptions: RetryOptions = { maxAttempts: 3, baseDelayMs: 50 }

export class ProviderUnreachableError extends Error {}

/** Distinct terminal error for local llama.cpp after retries are exhausted (020.5). */
export class LlamaCppProviderUnreachableError extends ProviderUnreachableError {}

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

function isLlamaCppConfigError(error: Error): boolean {
  return (
    error.name === 'LlamaCppLifecycleError' &&
    'category' in error &&
    (error as { category?: string }).category === 'config'
  )
}

export function isNonRetryableProviderError(error: Error): boolean {
  if (isTruncationError(error)) {
    return true
  }
  if (error instanceof LlamaCppParseError) {
    return true
  }
  return isLlamaCppConfigError(error)
}

function formatFailureLog(
  attempts: number,
  lastError: Error | undefined,
  diagnostics: RetryDiagnostics | undefined
): string {
  const parts = [
    `Provider unreachable after ${attempts} attempts`,
    diagnostics?.providerName ? `provider=${diagnostics.providerName}` : null,
    diagnostics?.hostPort ? `hostPort=${diagnostics.hostPort}` : null,
    diagnostics?.lifecycleState ? `lifecycleState=${diagnostics.lifecycleState}` : null,
    lastError ? `errorClass=${lastError.constructor.name}` : null,
    lastError ? `message=${lastError.message}` : null
  ]
  return parts.filter(Boolean).join(' ')
}

function terminalUnreachableError(
  message: string,
  diagnostics: RetryDiagnostics | undefined
): ProviderUnreachableError {
  if (diagnostics?.errorClassHint === 'local') {
    return new LlamaCppProviderUnreachableError(message)
  }
  return new ProviderUnreachableError(message)
}

export function withRetry(
  provider: Provider,
  logger?: RetryLogger,
  options: RetryOptions = defaultRetryOptions
): Provider {
  const shouldRetry = options.shouldRetry ?? ((error: Error) => !isNonRetryableProviderError(error))
  return {
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      let lastError: Error | undefined

      for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
        const result = await attemptOnce(provider, prompt, context)
        if (typeof result === 'string') {
          return result
        }
        if (!shouldRetry(result)) {
          throw result
        }
        lastError = result
        if (attempt < options.maxAttempts) {
          await delay(options.baseDelayMs * attempt)
        }
      }

      const message = formatFailureLog(options.maxAttempts, lastError, options.diagnostics)
      logger?.error(message)
      throw terminalUnreachableError(message, options.diagnostics)
    }
  }
}
