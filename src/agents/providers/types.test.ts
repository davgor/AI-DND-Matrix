import { describe, expect, it } from 'vitest'
import { createMockProvider } from './types'

describe('createMockProvider', () => {
  it('satisfies the Provider interface by returning the configured response', async () => {
    const provider = createMockProvider('a goblin leaps from the shadows')
    const result = await provider.generate('what do I see?', { systemPrompt: 'be terse' })
    expect(result).toBe('a goblin leaps from the shadows')
  })

  it('records every call for assertions in tests', async () => {
    const provider = createMockProvider('ok')
    await provider.generate('first', { maxTokens: 10 })
    await provider.generate('second')
    expect(provider.calls).toEqual([
      { prompt: 'first', context: { maxTokens: 10 } },
      { prompt: 'second', context: undefined }
    ])
  })
})
