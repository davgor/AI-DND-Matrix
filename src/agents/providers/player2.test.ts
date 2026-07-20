import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Player2RequestError,
  Player2TruncationError,
  Player2UnreachableError,
  createPlayer2Provider
} from './player2'

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

describe('createPlayer2Provider: max_tokens truncation guard (040.1)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws a typed truncation error instead of returning partial text when finish_reason is length', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: '{"narrationText":"The goblin lunges and' },
            finish_reason: 'length'
          }
        ]
      })
    )

    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })

    await expect(provider.generate('what do I see?', { maxTokens: 32 })).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(Player2TruncationError)
        expect(error).toBeInstanceOf(Player2RequestError)
        expect((error as Player2TruncationError).message).toContain('max_tokens')
        return true
      }
    )
  })

  it('returns the text normally when finish_reason is stop', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [
          { index: 0, message: { role: 'assistant', content: 'a complete answer' }, finish_reason: 'stop' }
        ]
      })
    )

    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })

    await expect(provider.generate('what do I see?')).resolves.toBe('a complete answer')
  })

  it('returns the text normally when the response has no finish_reason field', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ choices: [{ index: 0, message: { role: 'assistant', content: 'legacy-shaped' } }] })
    )

    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })

    await     expect(provider.generate('what do I see?')).resolves.toBe('legacy-shaped')
  })
})

describe('createPlayer2Provider: usage metering success', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls onUsage with OpenAI-compatible usage after a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        model: 'local-llama',
        choices: [{ index: 0, message: { role: 'assistant', content: 'done' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 25 }
      })
    )

    const onUsage = vi.fn()
    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })
    await provider.generate('hello', { onUsage })

    expect(onUsage).toHaveBeenCalledOnce()
    expect(onUsage).toHaveBeenCalledWith({
      inputTokens: 50,
      outputTokens: 25,
      totalTokens: 75,
      modelId: 'local-llama'
    })
  })
})

describe('createPlayer2Provider: usage metering model fallback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to player2 model id when the response omits model', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [{ index: 0, message: { role: 'assistant', content: 'done' } }],
        usage: { prompt_tokens: 1, completion_tokens: 2 }
      })
    )

    const onUsage = vi.fn()
    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })
    await provider.generate('hello', { onUsage })

    expect(onUsage).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: 'player2', inputTokens: 1, outputTokens: 2, totalTokens: 3 })
    )
  })
})

describe('createPlayer2Provider: usage metering absent usage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('records null usage without failing when usage is absent', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ choices: [{ index: 0, message: { role: 'assistant', content: 'done' } }] })
    )

    const onUsage = vi.fn()
    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })
    await provider.generate('hello', { onUsage })

    expect(onUsage).toHaveBeenCalledWith({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      modelId: 'player2'
    })
  })
})

describe('createPlayer2Provider: usage metering error paths', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not call onUsage on truncation or error paths', async () => {
    const onUsage = vi.fn()
    const provider = createPlayer2Provider({ baseUrl: 'http://127.0.0.1:4315' })

    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: '{"partial":' },
            finish_reason: 'length'
          }
        ],
        usage: { prompt_tokens: 5, completion_tokens: 32 }
      })
    )
    await expect(provider.generate('hello', { onUsage })).rejects.toBeInstanceOf(Player2TruncationError)
    expect(onUsage).not.toHaveBeenCalled()

    vi.mocked(fetch).mockResolvedValue(textResponse('bad request', 422))
    await expect(provider.generate('hello', { onUsage })).rejects.toBeInstanceOf(Player2RequestError)
    expect(onUsage).not.toHaveBeenCalled()
  })
})
