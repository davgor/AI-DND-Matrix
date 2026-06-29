import { describe, expect, it } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../shared/settings/types'
import type { AppConfig } from './config'
import { resolveProviderRegistryConfig } from './settingsRuntime'

const envConfig: AppConfig = {
  agentProvider: 'player2',
  player2BaseUrl: 'http://127.0.0.1:4315',
  claudeApiKey: 'env-claude-key',
  claudeModel: 'env-claude-model',
  llamaCppBaseUrl: 'http://127.0.0.1:8080',
  llamaCppServerPath: undefined,
  llamaCppModelPath: undefined,
  llamaCppCtxSize: 8192,
  llamaCppGpuLayers: 'all',
  llamaCppStartMode: 'attach'
}

describe('resolveProviderRegistryConfig', () => {
  it('falls back entirely to env config when no settings have been persisted', () => {
    const resolved = resolveProviderRegistryConfig(envConfig, null)

    expect(resolved.agentProvider).toBe('player2')
    expect(resolved.claudeApiKey).toBe('env-claude-key')
    expect(resolved.claudeModel).toBe('env-claude-model')
    expect(resolved.player2BaseUrl).toBe('http://127.0.0.1:4315')
    expect(resolved.llamaCppBaseUrl).toBe('http://127.0.0.1:8080')
  })

  it('prefers persisted settings over env config when both are present', () => {
    const persisted = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'claude' as const,
      claudeApiKey: 'persisted-claude-key',
      claudeModel: 'persisted-claude-model',
      player2BaseUrl: 'http://persisted-player2:1234',
      llamaCppBaseUrl: 'http://persisted-llama:9090'
    }

    const resolved = resolveProviderRegistryConfig(envConfig, persisted)

    expect(resolved.agentProvider).toBe('claude')
    expect(resolved.claudeApiKey).toBe('persisted-claude-key')
    expect(resolved.claudeModel).toBe('persisted-claude-model')
    expect(resolved.player2BaseUrl).toBe('http://persisted-player2:1234')
    expect(resolved.llamaCppBaseUrl).toBe('http://persisted-llama:9090')
  })

  it('falls back to the env Claude API key when persisted settings have an empty one', () => {
    const persisted = { ...DEFAULT_PROVIDER_SETTINGS, mode: 'claude' as const, claudeApiKey: '' }

    const resolved = resolveProviderRegistryConfig(envConfig, persisted)

    expect(resolved.claudeApiKey).toBe('env-claude-key')
  })

  it('resolves to the llamacpp provider with its persisted base URL when that mode is selected', () => {
    const persisted = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'llamacpp' as const,
      llamaCppBaseUrl: 'http://127.0.0.1:8081'
    }

    const resolved = resolveProviderRegistryConfig(envConfig, persisted)

    expect(resolved.agentProvider).toBe('llamacpp')
    expect(resolved.llamaCppBaseUrl).toBe('http://127.0.0.1:8081')
  })
})
