import { describe, expect, it } from 'vitest'
import { createMockProvider } from './types'
import { createProviderRegistry, selectProvider } from './selectProvider'

describe('selectProvider', () => {
  it('routes calls to the provider selected by config, leaving the other untouched', async () => {
    const claudeMock = createMockProvider('claude response')
    const player2Mock = createMockProvider('player2 response')
    const registry = { claude: claudeMock, player2: player2Mock }

    const result = await selectProvider('claude', registry).generate('hello')

    expect(result).toBe('claude response')
    expect(claudeMock.calls).toHaveLength(1)
    expect(claudeMock.calls[0]?.prompt).toBe('hello')
    expect(player2Mock.calls).toHaveLength(0)
  })

  it('routes calls to player2 when selected, leaving claude untouched', async () => {
    const claudeMock = createMockProvider('claude response')
    const player2Mock = createMockProvider('player2 response')
    const registry = { claude: claudeMock, player2: player2Mock }

    const result = await selectProvider('player2', registry).generate('hi there')

    expect(result).toBe('player2 response')
    expect(player2Mock.calls).toHaveLength(1)
    expect(player2Mock.calls[0]?.prompt).toBe('hi there')
    expect(claudeMock.calls).toHaveLength(0)
  })
})

describe('createProviderRegistry', () => {
  it('builds a registry with both provider names present', () => {
    const registry = createProviderRegistry({
      claudeApiKey: 'test-key',
      claudeModel: 'claude-test',
      player2BaseUrl: 'http://127.0.0.1:4315'
    })

    expect(registry.claude).toBeDefined()
    expect(registry.player2).toBeDefined()
  })
})
