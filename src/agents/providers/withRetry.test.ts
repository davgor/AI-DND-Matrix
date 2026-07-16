import { describe, expect, it } from 'vitest'
import { ClaudeTruncationError } from './claude'
import type { Provider } from './types'
import { ProviderUnreachableError, withRetry } from './withRetry'

function createAlwaysFailingProvider(message: string): { provider: Provider; calls: number[] } {
  const calls: number[] = []
  const provider: Provider = {
    async generate(): Promise<string> {
      calls.push(calls.length + 1)
      throw new Error(message)
    }
  }
  return { provider, calls }
}

function createEventuallySucceedingProvider(failuresBeforeSuccess: number, result: string): Provider {
  let attempts = 0
  return {
    async generate(): Promise<string> {
      attempts += 1
      if (attempts <= failuresBeforeSuccess) {
        throw new Error(`fail attempt ${attempts}`)
      }
      return result
    }
  }
}

describe('withRetry', () => {
  it('retries a failing provider maxAttempts times then throws ProviderUnreachableError', async () => {
    const { provider, calls } = createAlwaysFailingProvider('always fails')
    const retrying = withRetry(provider, undefined, { maxAttempts: 3, baseDelayMs: 1 })

    await expect(retrying.generate('prompt')).rejects.toBeInstanceOf(ProviderUnreachableError)
    expect(calls.length).toBe(3)
  })

  it('logs the failure via the injected logger after exhausting retries', async () => {
    const { provider } = createAlwaysFailingProvider('always fails')
    const errorMessages: string[] = []
    const logger = {
      error(message: string): void {
        errorMessages.push(message)
      }
    }
    const retrying = withRetry(provider, logger, { maxAttempts: 3, baseDelayMs: 1 })

    await expect(retrying.generate('prompt')).rejects.toBeInstanceOf(ProviderUnreachableError)
    expect(errorMessages.length).toBe(1)
  })

  it('resolves with the successful result once the provider recovers within maxAttempts', async () => {
    const provider = createEventuallySucceedingProvider(2, 'recovered response')
    const retrying = withRetry(provider, undefined, { maxAttempts: 3, baseDelayMs: 1 })

    await expect(retrying.generate('prompt')).resolves.toBe('recovered response')
  })

  it('rethrows truncation immediately without burning connectivity retries (040.14)', async () => {
    let attempts = 0
    const provider: Provider = {
      async generate(): Promise<string> {
        attempts += 1
        throw new ClaudeTruncationError('truncated at max_tokens')
      }
    }
    const retrying = withRetry(provider, undefined, { maxAttempts: 3, baseDelayMs: 1 })

    await expect(retrying.generate('prompt')).rejects.toBeInstanceOf(ClaudeTruncationError)
    expect(attempts).toBe(1)
  })
})
