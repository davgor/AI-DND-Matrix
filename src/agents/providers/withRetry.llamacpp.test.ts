import { describe, expect, it } from 'vitest'
import { LlamaCppLifecycleError } from '../../main/llamacpp/lifecycle'
import { LlamaCppParseError, LlamaCppUnreachableError } from './llamacpp'
import type { Provider } from './types'
import {
  LlamaCppProviderUnreachableError,
  isNonRetryableProviderError,
  withRetry
} from './withRetry'

describe('isNonRetryableProviderError', () => {
  it('treats llama config lifecycle errors as non-retryable', () => {
    expect(isNonRetryableProviderError(new LlamaCppLifecycleError('bad config', 'config'))).toBe(
      true
    )
  })

  it('retries transient unreachable errors', () => {
    expect(isNonRetryableProviderError(new LlamaCppUnreachableError('down'))).toBe(false)
  })
})

describe('withRetry llama: fail-fast config', () => {
  it('fails fast on non-retryable config errors without delaying', async () => {
    let attempts = 0
    const provider: Provider = {
      async generate(): Promise<string> {
        attempts += 1
        throw new LlamaCppLifecycleError('Managed mode requires paths', 'config')
      }
    }
    const retrying = withRetry(provider, undefined, { maxAttempts: 3, baseDelayMs: 50 })
    await expect(retrying.generate('prompt')).rejects.toBeInstanceOf(LlamaCppLifecycleError)
    expect(attempts).toBe(1)
  })
})

describe('withRetry llama: transient success', () => {
  it('retries transient failure then succeeds', async () => {
    let attempts = 0
    const provider: Provider = {
      async generate(): Promise<string> {
        attempts += 1
        if (attempts < 2) {
          throw new LlamaCppUnreachableError('temporary')
        }
        return 'ok'
      }
    }
    const retrying = withRetry(provider, undefined, { maxAttempts: 3, baseDelayMs: 1 })
    await expect(retrying.generate('prompt')).resolves.toBe('ok')
    expect(attempts).toBe(2)
  })
})

describe('withRetry llama: exhausted retries', () => {
  it('throws typed LlamaCppProviderUnreachableError after exhausting retries', async () => {
    const provider: Provider = {
      async generate(): Promise<string> {
        throw new LlamaCppUnreachableError('still down')
      }
    }
    const logs: string[] = []
    const retrying = withRetry(
      provider,
      {
        error(message: string): void {
          logs.push(message)
        }
      },
      {
        maxAttempts: 2,
        baseDelayMs: 1,
        diagnostics: {
          providerName: 'llamacpp',
          hostPort: '127.0.0.1:8080',
          lifecycleState: 'ready',
          errorClassHint: 'local'
        }
      }
    )
    await expect(retrying.generate('prompt')).rejects.toBeInstanceOf(LlamaCppProviderUnreachableError)
    expect(logs[0]).toContain('provider=llamacpp')
    expect(logs[0]).toContain('hostPort=127.0.0.1:8080')
    expect(logs[0]).toContain('lifecycleState=ready')
    expect(logs[0]).toContain('errorClass=LlamaCppUnreachableError')
  })
})

describe('withRetry llama: parse errors', () => {
  it('does not retry parse errors', async () => {
    let attempts = 0
    const provider: Provider = {
      async generate(): Promise<string> {
        attempts += 1
        throw new LlamaCppParseError('missing content')
      }
    }
    const retrying = withRetry(provider, undefined, { maxAttempts: 3, baseDelayMs: 1 })
    await expect(retrying.generate('prompt')).rejects.toBeInstanceOf(LlamaCppParseError)
    expect(attempts).toBe(1)
  })
})
