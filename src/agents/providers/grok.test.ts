import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GrokConfigError,
  GrokRequestError,
  GrokTruncationError,
  createGrokProvider,
  testGrokConnection
} from './grok'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

describe('createGrokProvider: success', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls xAI chat completions with the default base URL', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [{ message: { role: 'assistant', content: 'a goblin leaps' } }],
        usage: { prompt_tokens: 3, completion_tokens: 2 }
      })
    )
    const provider = createGrokProvider({ apiKey: 'xai-test', model: 'grok-3' })
    const result = await provider.generate('what do I see?', { maxTokens: 32 })
    expect(result).toBe('a goblin leaps')
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://api.x.ai/v1/chat/completions')
  })

  it('allows overriding the base URL', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ choices: [{ message: { role: 'assistant', content: 'hi' } }] })
    )
    await createGrokProvider({
      apiKey: 'xai-test',
      model: 'grok-3',
      baseUrl: 'https://custom.x.ai/'
    }).generate('hello')
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://custom.x.ai/v1/chat/completions')
  })
})

describe('createGrokProvider: errors', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws config error when API key missing', async () => {
    const provider = createGrokProvider({ apiKey: undefined, model: 'grok-3' })
    await expect(provider.generate('hello')).rejects.toBeInstanceOf(GrokConfigError)
  })

  it('throws request error without leaking the API key', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'denied' }, 401))
    const provider = createGrokProvider({ apiKey: 'xai-super-secret', model: 'grok-3' })
    await expect(provider.generate('hello')).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(GrokRequestError)
      expect((error as GrokRequestError).message).not.toContain('xai-super-secret')
      return true
    })
  })

  it('throws truncation error when finish_reason is length', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [{ message: { role: 'assistant', content: 'partial' }, finish_reason: 'length' }]
      })
    )
    const provider = createGrokProvider({ apiKey: 'xai-test', model: 'grok-3' })
    await expect(provider.generate('hello')).rejects.toBeInstanceOf(GrokTruncationError)
  })
})

describe('testGrokConnection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ choices: [{ message: { role: 'assistant', content: 'pong' } }] })
    )
    expect(await testGrokConnection('xai-test', 'grok-3')).toMatchObject({ ok: true })
  })
})
