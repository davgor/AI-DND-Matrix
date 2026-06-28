import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Player2RequestError, Player2UnreachableError, createPlayer2Provider } from './player2'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as Response
}

function textResponse(body: string, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body
  } as Response
}

describe('createPlayer2Provider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the Player2 chat-completions endpoint and returns the generated text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [{ index: 0, message: { role: 'assistant', content: 'a goblin leaps from the shadows' } }]
      })
    )

    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })
    const result = await provider.generate('what do I see?', { systemPrompt: 'Be terse.', maxTokens: 64 })

    expect(result).toBe('a goblin leaps from the shadows')
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://127.0.0.1:4315/v1/chat/completions')
    const body = JSON.parse(init?.body as string)
    expect(body.messages).toEqual([
      { role: 'system', content: 'Be terse.' },
      { role: 'user', content: 'what do I see?' }
    ])
    expect(body.max_tokens).toBe(64)
  })

  it('omits the system message when no systemPrompt is given', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ choices: [{ index: 0, message: { role: 'assistant', content: 'hi' } }] })
    )

    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })
    await provider.generate('hello')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(init?.body as string)
    expect(body.messages).toEqual([{ role: 'user', content: 'hello' }])
  })

  it('throws a typed request error on a non-2xx response with a plain-text body', async () => {
    vi.mocked(fetch).mockResolvedValue(textResponse('missing field `messages`', 422))

    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })

    await expect(provider.generate('hello')).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Player2RequestError)
      expect((error as Player2RequestError).status).toBe(422)
      return true
    })
  })

  it('throws a typed unreachable error on a connection failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })

    await expect(provider.generate('hello')).rejects.toBeInstanceOf(Player2UnreachableError)
  })
})
