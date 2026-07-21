import { describe, expect, it, vi } from 'vitest'
import { ClaudeRequestError, ClaudeTruncationError } from './claude'
import { Player2RequestError, Player2TruncationError } from './player2'
import {
  DEFAULT_ESCALATION_BASE,
  ESCALATION_MIN_CAP,
  MAX_TOKEN_ESCALATIONS,
  TOKEN_ESCALATION_CEILING,
  isTruncationError,
  withTokenEscalation
} from './tokenEscalation'
import type { GenerateContext, Provider } from './types'

interface RecordedCall {
  prompt: string
  context: GenerateContext | undefined
}

function expectMatchingContext(
  actual: GenerateContext | undefined,
  expected: GenerateContext,
  options?: { allowUsageWrapper?: boolean }
): void {
  expect(actual?.systemPrompt).toBe(expected.systemPrompt)
  expect(actual?.maxTokens).toBe(expected.maxTokens)
  if (options?.allowUsageWrapper) {
    expect(typeof actual?.onUsage).toBe('function')
  } else {
    expect(actual?.onUsage).toBe(expected.onUsage)
  }
}

function truncatingProvider(truncationsBeforeSuccess: number): Provider & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = []
  return {
    calls,
    async generate(prompt: string, context?: GenerateContext): Promise<string> {
      calls.push({ prompt, context })
      if (calls.length <= truncationsBeforeSuccess) {
        throw new ClaudeTruncationError('truncated at max_tokens')
      }
      return '{"ok":true}'
    }
  }
}

describe('isTruncationError', () => {
  it('detects both adapters truncation errors via the shared marker', () => {
    expect(isTruncationError(new ClaudeTruncationError('cut off'))).toBe(true)
    expect(isTruncationError(new Player2TruncationError('cut off'))).toBe(true)
  })

  it('rejects other errors including the adapters request errors', () => {
    expect(isTruncationError(new Error('boom'))).toBe(false)
    expect(isTruncationError(new ClaudeRequestError('bad status', 500))).toBe(false)
    expect(isTruncationError(new Player2RequestError('bad status', 500))).toBe(false)
    expect(isTruncationError(undefined)).toBe(false)
    expect(isTruncationError('truncated')).toBe(false)
  })
})

describe('withTokenEscalation', () => {
  it('passes through successful calls untouched', async () => {
    const inner = truncatingProvider(0)
    const provider = withTokenEscalation(inner)
    const context: GenerateContext = { systemPrompt: 'sys', maxTokens: 256 }

    const result = await provider.generate('hello', context)

    expect(result).toBe('{"ok":true}')
    expect(inner.calls).toHaveLength(1)
    expectMatchingContext(inner.calls[0]?.context, context, { allowUsageWrapper: true })
  })

  it('retries a truncated call with a doubled cap and the identical prompt + systemPrompt', async () => {
    const inner = truncatingProvider(1)
    const provider = withTokenEscalation(inner)

    const result = await provider.generate('hello', { systemPrompt: 'sys', maxTokens: 1024 })

    expect(result).toBe('{"ok":true}')
    expect(inner.calls).toHaveLength(2)
    expect(inner.calls[1]?.prompt).toBe('hello')
    expect(inner.calls[1]?.context?.systemPrompt).toBe('sys')
    expect(inner.calls[1]?.context?.maxTokens).toBe(2048)
  })

  it('does not mutate the caller-supplied context object when escalating', async () => {
    const inner = truncatingProvider(1)
    const provider = withTokenEscalation(inner)
    const shared: GenerateContext = { systemPrompt: 'sys', maxTokens: 512 }

    await provider.generate('hello', shared)

    expect(shared.maxTokens).toBe(512)
    expectMatchingContext(inner.calls[0]?.context, shared, { allowUsageWrapper: true })
    expect(inner.calls[1]?.context).not.toBe(shared)
    expect(inner.calls[1]?.context?.maxTokens).toBe(1024)
  })

})

describe('withTokenEscalation bounds', () => {
  it('escalates at most MAX_TOKEN_ESCALATIONS times then rethrows the truncation error', async () => {
    const inner = truncatingProvider(Number.POSITIVE_INFINITY)
    const provider = withTokenEscalation(inner)

    await expect(provider.generate('hello', { maxTokens: 1024 })).rejects.toBeInstanceOf(
      ClaudeTruncationError
    )
    expect(inner.calls).toHaveLength(1 + MAX_TOKEN_ESCALATIONS)
    expect(inner.calls.map((call) => call.context?.maxTokens)).toEqual([1024, 2048, 4096])
  })

  it('clamps escalated caps to the absolute ceiling', async () => {
    const inner = truncatingProvider(Number.POSITIVE_INFINITY)
    const provider = withTokenEscalation(inner)

    await expect(
      provider.generate('hello', { maxTokens: TOKEN_ESCALATION_CEILING - 1 })
    ).rejects.toBeInstanceOf(ClaudeTruncationError)
    const caps = inner.calls.map((call) => call.context?.maxTokens)
    expect(Math.max(...caps.map((cap) => cap ?? 0))).toBe(TOKEN_ESCALATION_CEILING)
  })

  it('escalates from the adapter default when the call had no explicit cap', async () => {
    const inner = truncatingProvider(1)
    const provider = withTokenEscalation(inner)

    await provider.generate('hello')

    expect(inner.calls[1]?.context?.maxTokens).toBe(DEFAULT_ESCALATION_BASE * 2)
  })

  it('never escalates intentional tiny caps (connectivity pings)', async () => {
    const inner = truncatingProvider(Number.POSITIVE_INFINITY)
    const provider = withTokenEscalation(inner)

    await expect(provider.generate('ping', { maxTokens: ESCALATION_MIN_CAP })).rejects.toBeInstanceOf(
      ClaudeTruncationError
    )
    expect(inner.calls).toHaveLength(1)
  })

  it('rethrows non-truncation errors untouched without extra attempts', async () => {
    const failure = new Player2RequestError('bad status', 500)
    const calls: RecordedCall[] = []
    const inner: Provider = {
      async generate(prompt: string, context?: GenerateContext): Promise<string> {
        calls.push({ prompt, context })
        throw failure
      }
    }
    const provider = withTokenEscalation(inner)

    await expect(provider.generate('hello', { maxTokens: 512 })).rejects.toBe(failure)
    expect(calls).toHaveLength(1)
  })
})

describe('withTokenEscalation: usage aggregation on success', () => {
  it('aggregates inner onUsage snapshots and invokes the outer callback once on success', async () => {
    let attempt = 0
    const inner: Provider = {
      async generate(_prompt, context) {
        attempt += 1
        context?.onUsage?.({
          inputTokens: attempt * 10,
          outputTokens: attempt,
          totalTokens: attempt * 11,
          modelId: 'inner-model'
        })
        if (attempt < 2) {
          throw new ClaudeTruncationError('truncated')
        }
        return 'ok'
      }
    }

    const onUsage = vi.fn()
    const provider = withTokenEscalation(inner)
    const result = await provider.generate('hello', { maxTokens: 1024, onUsage })

    expect(result).toBe('ok')
    expect(onUsage).toHaveBeenCalledOnce()
    expect(onUsage).toHaveBeenCalledWith({
      inputTokens: 30,
      outputTokens: 3,
      totalTokens: 33,
      modelId: 'inner-model'
    })
  })
})

describe('withTokenEscalation: usage aggregation on failure', () => {
  it('does not invoke outer onUsage when all escalated attempts fail', async () => {
    const inner = truncatingProvider(Number.POSITIVE_INFINITY)
    const onUsage = vi.fn()
    const provider = withTokenEscalation(inner)

    await expect(provider.generate('hello', { maxTokens: 1024, onUsage })).rejects.toBeInstanceOf(
      ClaudeTruncationError
    )
    expect(onUsage).not.toHaveBeenCalled()
  })
})

describe('withTokenEscalation: usage wrapper', () => {
  it('passes a wrapped onUsage to the inner provider instead of the caller callback', async () => {
    const onUsage = vi.fn()
    const inner: Provider = {
      async generate(_prompt, context) {
        expect(context?.onUsage).not.toBe(onUsage)
        context?.onUsage?.({ inputTokens: 1, outputTokens: 2, totalTokens: 3, modelId: 'm' })
        return 'ok'
      }
    }

    await withTokenEscalation(inner).generate('hello', { onUsage })
    expect(onUsage).toHaveBeenCalledOnce()
  })
})
