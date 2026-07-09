import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ClaudeConfigError,
  ClaudeRequestError,
  ClaudeTruncationError,
  createClaudeProvider
} from './claude'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

describe('createClaudeProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the Anthropic Messages API and returns the generated text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ content: [{ type: 'text', text: 'a goblin leaps from the shadows' }] })
    )

    const provider = createClaudeProvider({ apiKey: 'sk-test-key', model: 'claude-sonnet-4-6' })
    const result = await provider.generate('what do I see?')

    expect(result).toBe('a goblin leaps from the shadows')
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(init?.headers).toMatchObject({ 'x-api-key': 'sk-test-key' })
  })

  it('throws a typed config error and never calls fetch when no API key is configured', async () => {
    const provider = createClaudeProvider({ apiKey: undefined, model: 'claude-sonnet-4-6' })

    await expect(provider.generate('hello')).rejects.toBeInstanceOf(ClaudeConfigError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws a typed request error on a non-2xx response, without leaking the API key', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'rate limited' }, 429))

    const provider = createClaudeProvider({ apiKey: 'sk-super-secret', model: 'claude-sonnet-4-6' })

    await expect(provider.generate('hello')).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ClaudeRequestError)
      expect((error as ClaudeRequestError).message).not.toContain('sk-super-secret')
      expect((error as ClaudeRequestError).status).toBe(429)
      return true
    })
  })

  it('throws a typed request error on a network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

    const provider = createClaudeProvider({ apiKey: 'sk-test-key', model: 'claude-sonnet-4-6' })

    await expect(provider.generate('hello')).rejects.toBeInstanceOf(ClaudeRequestError)
  })
})

describe('createClaudeProvider: max_tokens truncation guard (040.1)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws a typed truncation error instead of returning partial text when stop_reason is max_tokens', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        content: [{ type: 'text', text: '{"narrationText":"The goblin lunges and' }],
        stop_reason: 'max_tokens'
      })
    )

    const provider = createClaudeProvider({ apiKey: 'sk-test-key', model: 'claude-sonnet-4-6' })

    await expect(provider.generate('what do I see?', { maxTokens: 32 })).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ClaudeTruncationError)
        expect(error).toBeInstanceOf(ClaudeRequestError)
        expect((error as ClaudeTruncationError).message).toContain('max_tokens')
        return true
      }
    )
  })

  it('returns the text normally when stop_reason is end_turn', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        content: [{ type: 'text', text: 'a complete answer' }],
        stop_reason: 'end_turn'
      })
    )

    const provider = createClaudeProvider({ apiKey: 'sk-test-key', model: 'claude-sonnet-4-6' })

    await expect(provider.generate('what do I see?')).resolves.toBe('a complete answer')
  })

  it('returns the text normally when the response has no stop_reason field', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ content: [{ type: 'text', text: 'legacy-shaped response' }] })
    )

    const provider = createClaudeProvider({ apiKey: 'sk-test-key', model: 'claude-sonnet-4-6' })

    await expect(provider.generate('what do I see?')).resolves.toBe('legacy-shaped response')
  })
})

describe('createClaudeProvider: GenerateContext pass-through (040.9)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'ok' }] }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('passes systemPrompt and maxTokens through to the Messages API body', async () => {
    const provider = createClaudeProvider({ apiKey: 'sk-test-key', model: 'claude-sonnet-4-6' })
    await provider.generate('what do I see?', { systemPrompt: 'Be terse.', maxTokens: 64 })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(init?.body as string) as {
      system?: string
      max_tokens: number
      messages: Array<{ role: string; content: string }>
    }
    expect(body.system).toBe('Be terse.')
    expect(body.max_tokens).toBe(64)
    expect(body.messages).toEqual([{ role: 'user', content: 'what do I see?' }])
  })

  it('omits the system field when no systemPrompt is given', async () => {
    const provider = createClaudeProvider({ apiKey: 'sk-test-key', model: 'claude-sonnet-4-6' })
    await provider.generate('hello')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(init?.body as string) as { system?: string }
    expect(body.system).toBeUndefined()
  })
})
