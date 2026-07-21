import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GeminiConfigError,
  GeminiRequestError,
  GeminiTruncationError,
  createGeminiProvider,
  testGeminiConnection
} from './gemini'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

describe('createGeminiProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls generateContent and returns text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: 'a goblin leaps' }] } }],
        usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 3 }
      })
    )
    const provider = createGeminiProvider({ apiKey: 'gem-test', model: 'gemini-2.5-flash' })
    const result = await provider.generate('what do I see?', {
      systemPrompt: 'Be terse.',
      maxTokens: 64
    })
    expect(result).toBe('a goblin leaps')
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('gemini-2.5-flash:generateContent')
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'gem-test' })
  })

  it('throws config error when API key missing', async () => {
    const provider = createGeminiProvider({ apiKey: undefined, model: 'gemini-2.5-flash' })
    await expect(provider.generate('hello')).rejects.toBeInstanceOf(GeminiConfigError)
  })

  it('throws request error without leaking the API key', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'denied' }, 403))
    const provider = createGeminiProvider({ apiKey: 'gem-super-secret', model: 'gemini-2.5-flash' })
    await expect(provider.generate('hello')).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(GeminiRequestError)
      expect((error as GeminiRequestError).message).not.toContain('gem-super-secret')
      return true
    })
  })

  it('throws truncation error on MAX_TOKENS finish reason', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: 'partial' }] }, finishReason: 'MAX_TOKENS' }]
      })
    )
    const provider = createGeminiProvider({ apiKey: 'gem-test', model: 'gemini-2.5-flash' })
    await expect(provider.generate('hello')).rejects.toBeInstanceOf(GeminiTruncationError)
  })
})

describe('testGeminiConnection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ candidates: [{ content: { parts: [{ text: 'pong' }] } }] })
    )
    expect(await testGeminiConnection('gem-test', 'gemini-2.5-flash')).toMatchObject({ ok: true })
  })
})
