import { describe, expect, it } from 'vitest'
import { createMockProvider } from './types'
import { createProviderRegistry, selectProvider } from './selectProvider'

function mockRegistry() {
  const claude = createMockProvider('claude response')
  const openai = createMockProvider('openai response')
  const gemini = createMockProvider('gemini response')
  const grok = createMockProvider('grok response')
  const player2 = createMockProvider('player2 response')
  return {
    claude,
    openai,
    gemini,
    grok,
    player2,
    llamacpp: player2,
    mocks: { claude, openai, gemini, grok, player2 }
  }
}

describe('selectProvider', () => {
  it('routes calls to the provider selected by config, leaving the other untouched', async () => {
    const { mocks, ...registry } = mockRegistry()

    const result = await selectProvider('claude', registry).generate('hello')

    expect(result).toBe('claude response')
    expect(mocks.claude.calls).toHaveLength(1)
    expect(mocks.player2.calls).toHaveLength(0)
  })

  it('routes calls to player2 when selected', async () => {
    const { mocks, ...registry } = mockRegistry()

    const result = await selectProvider('player2', registry).generate('hi there')

    expect(result).toBe('player2 response')
    expect(mocks.player2.calls).toHaveLength(1)
    expect(mocks.claude.calls).toHaveLength(0)
  })

  it('routes calls to openai when selected', async () => {
    const { mocks, ...registry } = mockRegistry()
    expect(await selectProvider('openai', registry).generate('hi')).toBe('openai response')
    expect(mocks.openai.calls).toHaveLength(1)
  })

  it('routes calls to gemini when selected', async () => {
    const { mocks, ...registry } = mockRegistry()
    expect(await selectProvider('gemini', registry).generate('hi')).toBe('gemini response')
    expect(mocks.gemini.calls).toHaveLength(1)
  })

  it('routes calls to grok when selected', async () => {
    const { mocks, ...registry } = mockRegistry()
    expect(await selectProvider('grok', registry).generate('hi')).toBe('grok response')
    expect(mocks.grok.calls).toHaveLength(1)
  })
})

describe('createProviderRegistry', () => {
  it('builds a registry with every provider name present', () => {
    const registry = createProviderRegistry({
      claudeApiKey: 'test-key',
      claudeModel: 'claude-test',
      openaiApiKey: 'openai-key',
      openaiModel: 'gpt-4.1-mini',
      geminiApiKey: 'gemini-key',
      geminiModel: 'gemini-2.5-flash',
      grokApiKey: 'grok-key',
      grokModel: 'grok-3',
      player2BaseUrl: 'http://127.0.0.1:4315',
      llamaCppBaseUrl: 'http://127.0.0.1:8080'
    })

    expect(registry.claude).toBeDefined()
    expect(registry.openai).toBeDefined()
    expect(registry.gemini).toBeDefined()
    expect(registry.grok).toBeDefined()
    expect(registry.player2).toBeDefined()
    expect(registry.llamacpp).toBeDefined()
  })

  it('wires llamacpp to a dedicated adapter instance (not the player2 factory result alias)', () => {
    const registry = createProviderRegistry({
      claudeApiKey: 'test-key',
      claudeModel: 'claude-test',
      openaiApiKey: 'openai-key',
      openaiModel: 'gpt-4.1-mini',
      geminiApiKey: 'gemini-key',
      geminiModel: 'gemini-2.5-flash',
      grokApiKey: 'grok-key',
      grokModel: 'grok-3',
      player2BaseUrl: 'http://127.0.0.1:4315',
      llamaCppBaseUrl: 'http://127.0.0.1:8080'
    })

    expect(registry.llamacpp).not.toBe(registry.player2)
  })
})
