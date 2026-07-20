import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OpenAiConfigError,
  OpenAiRequestError,
  OpenAiTruncationError,
  createOpenAiProvider,
  testOpenAiConnection
} from './openai'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

describe('createOpenAiProvider: success', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls Chat Completions and returns generated text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [{ message: { role: 'assistant', content: 'a goblin leaps' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      })
    )
    const provider = createOpenAiProvider({ apiKey: 'sk-test', model: 'gpt-4.1-mini' })
    const result = await provider.generate('what do I see?', {
      systemPrompt: 'Be terse.',
      maxTokens: 64
    })
    expect(result).toBe('a goblin leaps')
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(init?.headers).toMatchObject({ authorization: 'Bearer sk-test' })
    const body = JSON.parse(init?.body as string)
    expect(body.model).toBe('gpt-4.1-mini')
    expect(body.max_tokens).toBe(64)
  })
})

describe('createOpenAiProvider: errors', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws a typed config error when no API key is configured', async () => {
    const provider = createOpenAiProvider({ apiKey: undefined, model: 'gpt-4.1-mini' })
    await expect(provider.generate('hello')).rejects.toBeInstanceOf(OpenAiConfigError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws a typed request error without leaking the API key', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401))
    const provider = createOpenAiProvider({ apiKey: 'sk-super-secret', model: 'gpt-4.1-mini' })
    await expect(provider.generate('hello')).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(OpenAiRequestError)
      expect((error as OpenAiRequestError).message).not.toContain('sk-super-secret')
      return true
    })
  })

  it('throws truncation error when finish_reason is length', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [{ message: { role: 'assistant', content: '{"partial"' }, finish_reason: 'length' }]
      })
    )
    const provider = createOpenAiProvider({ apiKey: 'sk-test', model: 'gpt-4.1-mini' })
    await expect(provider.generate('hello', { maxTokens: 8 })).rejects.toBeInstanceOf(OpenAiTruncationError)
  })
})

describe('testOpenAiConnection', () => {
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
    expect(await testOpenAiConnection('sk-test', 'gpt-4.1-mini')).toMatchObject({ ok: true })
  })

  it('treats truncation as connected', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [{ message: { role: 'assistant', content: 'p' }, finish_reason: 'length' }]
      })
    )
    expect(await testOpenAiConnection('sk-test', 'gpt-4.1-mini')).toMatchObject({ ok: true })
  })
})
