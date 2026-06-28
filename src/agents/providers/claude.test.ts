import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClaudeConfigError, ClaudeRequestError, createClaudeProvider } from './claude'

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
