import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LlamaCppParseError,
  LlamaCppRequestError,
  LlamaCppTruncationError,
  LlamaCppUnreachableError,
  clampLlamaCompletionMaxTokens,
  createLlamaCppProvider
} from './llamacpp'

describe('clampLlamaCompletionMaxTokens', () => {
  it('leaves headroom for the prompt inside the configured ctx window', () => {
    expect(clampLlamaCompletionMaxTokens(8192, 8192)).toBe(4096)
    expect(clampLlamaCompletionMaxTokens(8192, 2048)).toBe(2048)
    expect(clampLlamaCompletionMaxTokens(4096, 8192)).toBe(2048)
  })

  it('never drops below a usable micro floor when ctx is tiny', () => {
    expect(clampLlamaCompletionMaxTokens(512, 8192)).toBe(256)
  })
})

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as Response
}

function withFetchStub(run: () => Promise<void>): Promise<void> {
  vi.stubGlobal('fetch', vi.fn())
  return run().finally(() => {
    vi.unstubAllGlobals()
  })
}

describe('createLlamaCppProvider success', () => {
  it('posts chat-completions and returns assistant content', async () => {
    await withFetchStub(async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({
          choices: [{ message: { role: 'assistant', content: 'You see a mossy door.' } }]
        })
      )

      const provider = createLlamaCppProvider({ baseUrl: 'http://127.0.0.1:8080' })
      const result = await provider.generate('look around', {
        systemPrompt: 'Be terse.',
        maxTokens: 128
      })

      expect(result).toBe('You see a mossy door.')
      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('http://127.0.0.1:8080/v1/chat/completions')
      expect(JSON.parse(init?.body as string)).toEqual({
        messages: [
          { role: 'system', content: 'Be terse.' },
          { role: 'user', content: 'look around' }
        ],
        max_tokens: 128
      })
    })
  })

  it('clamps max_tokens to leave prompt reserve in the configured ctx window', async () => {
    await withFetchStub(async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({
          choices: [{ message: { role: 'assistant', content: 'ok' } }]
        })
      )

      const provider = createLlamaCppProvider({
        baseUrl: 'http://127.0.0.1:8080',
        ctxSize: 8192
      })
      await provider.generate('look around', { maxTokens: 8192 })

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0]?.[1]?.body as string) as {
        max_tokens: number
      }
      expect(body.max_tokens).toBe(4096)
    })
  })
})

describe('createLlamaCppProvider parse errors', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws a typed parse error when choices are missing', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}))
    const provider = createLlamaCppProvider({ baseUrl: 'http://127.0.0.1:8080' })
    await expect(provider.generate('hello')).rejects.toBeInstanceOf(LlamaCppParseError)
  })

  it('throws a typed parse error when message content is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ choices: [{ message: { role: 'assistant' } }] })
    )
    const provider = createLlamaCppProvider({ baseUrl: 'http://127.0.0.1:8080' })
    const error = await provider.generate('secret-prompt-body').catch((err: unknown) => err)
    expect(error).toBeInstanceOf(LlamaCppParseError)
    expect((error as Error).message).not.toContain('secret-prompt-body')
  })
})

describe('createLlamaCppProvider network errors', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws unreachable on connection failure without echoing the prompt', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))
    const provider = createLlamaCppProvider({ baseUrl: 'http://127.0.0.1:8080' })
    const error = await provider.generate('do-not-log-this').catch((err: unknown) => err)
    expect(error).toBeInstanceOf(LlamaCppUnreachableError)
    expect((error as Error).message).not.toContain('do-not-log-this')
  })

  it('throws a typed request error on non-2xx', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'internal'
    } as Response)
    const provider = createLlamaCppProvider({ baseUrl: 'http://127.0.0.1:8080' })
    await expect(provider.generate('hello')).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(LlamaCppRequestError)
      expect((error as LlamaCppRequestError).status).toBe(500)
      return true
    })
  })
})

describe('createLlamaCppProvider truncation', () => {
  it('throws truncation when finish_reason is length', async () => {
    await withFetchStub(async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({
          choices: [
            {
              message: { role: 'assistant', content: '{"partial":' },
              finish_reason: 'length'
            }
          ]
        })
      )
      const provider = createLlamaCppProvider({ baseUrl: 'http://127.0.0.1:8080' })
      await expect(provider.generate('hello', { maxTokens: 16 })).rejects.toBeInstanceOf(
        LlamaCppTruncationError
      )
    })
  })
})
