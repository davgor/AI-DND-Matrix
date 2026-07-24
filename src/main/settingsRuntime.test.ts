import { describe, expect, it } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../shared/settings/types'
import type { AppConfig } from './config'
import { resolveLlamaCppLifecycleConfig, resolveProviderRegistryConfig } from './settingsRuntime'

const envConfig: AppConfig = {
  agentProvider: 'player2',
  player2BaseUrl: 'http://127.0.0.1:4315',
  claudeApiKey: 'env-claude-key',
  claudeModel: 'env-claude-model',
  openaiApiKey: 'env-openai-key',
  openaiModel: 'env-openai-model',
  geminiApiKey: 'env-gemini-key',
  geminiModel: 'env-gemini-model',
  grokApiKey: 'env-grok-key',
  grokModel: 'env-grok-model',
  llamaCppBaseUrl: 'http://127.0.0.1:8080',
  llamaCppServerPath: undefined,
  llamaCppModelPath: undefined,
  llamaCppCtxSize: 8192,
  llamaCppGpuLayers: 'all',
  llamaCppStartMode: 'attach'
}

describe('resolveProviderRegistryConfig: env fallback', () => {
  it('falls back entirely to env config when no settings have been persisted', () => {
    const resolved = resolveProviderRegistryConfig(envConfig, null)

    expect(resolved.agentProvider).toBe('player2')
    expect(resolved.claudeApiKey).toBe('env-claude-key')
    expect(resolved.claudeModel).toBe('env-claude-model')
    expect(resolved.player2BaseUrl).toBe('http://127.0.0.1:4315')
    expect(resolved.llamaCppBaseUrl).toBe('http://127.0.0.1:8080')
    expect(resolved.llamaCppCtxSize).toBe(8192)
  })

  it('falls back to the env Claude API key when persisted settings have an empty one', () => {
    const persisted = { ...DEFAULT_PROVIDER_SETTINGS, mode: 'claude' as const, claudeApiKey: '' }
    const resolved = resolveProviderRegistryConfig(envConfig, persisted)
    expect(resolved.claudeApiKey).toBe('env-claude-key')
  })

  it('falls back to env openai key when persisted key is empty', () => {
    const persisted = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'openai' as const,
      openaiApiKey: ''
    }
    const resolved = resolveProviderRegistryConfig(envConfig, persisted)
    expect(resolved.openaiApiKey).toBe('env-openai-key')
  })
})

describe('resolveProviderRegistryConfig: persisted prefs', () => {
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

  it('resolves openai mode with persisted key and model', () => {
    const persisted = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'openai' as const,
      openaiApiKey: 'persisted-openai',
      openaiModel: 'gpt-4.1'
    }

    const resolved = resolveProviderRegistryConfig(envConfig, persisted)

    expect(resolved.agentProvider).toBe('openai')
    expect(resolved.openaiApiKey).toBe('persisted-openai')
    expect(resolved.openaiModel).toBe('gpt-4.1')
  })

  it('resolves llamacpp mode with persisted base URL', () => {
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

describe('resolveLlamaCppLifecycleConfig', () => {
  it('uses env lifecycle fields when nothing is persisted', () => {
    const resolved = resolveLlamaCppLifecycleConfig(
      {
        ...envConfig,
        llamaCppServerPath: 'C:\\env\\llama-server.exe',
        llamaCppModelPath: 'C:\\env\\model.gguf',
        llamaCppCtxSize: 4096,
        llamaCppGpuLayers: '20',
        llamaCppStartMode: 'managed'
      },
      null
    )
    expect(resolved).toMatchObject({
      serverPath: 'C:\\env\\llama-server.exe',
      modelPath: 'C:\\env\\model.gguf',
      ctxSize: 4096,
      gpuLayers: '20',
      startMode: 'managed'
    })
  })

  it('honors config-only swaps of path, ctx, and gpu from persisted settings', () => {
    const persisted = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'llamacpp' as const,
      llamaCppBaseUrl: 'http://127.0.0.1:8090',
      llamaCppServerPath: 'C:\\settings\\llama-server.exe',
      llamaCppModelPath: 'C:\\settings\\qwen.gguf',
      llamaCppCtxSize: 16384,
      llamaCppGpuLayers: '33',
      llamaCppStartMode: 'managed' as const,
      llamaCppCatalogModelId: 'qwen25-7b-instruct-q4-k-m',
      llamaCppDownloadState: 'ready' as const
    }
    const resolved = resolveLlamaCppLifecycleConfig(envConfig, persisted)
    expect(resolved.baseUrl).toBe('http://127.0.0.1:8090')
    expect(resolved.serverPath).toBe('C:\\settings\\llama-server.exe')
    expect(resolved.modelPath).toBe('C:\\settings\\qwen.gguf')
    expect(resolved.ctxSize).toBe(16384)
    expect(resolved.gpuLayers).toBe('33')
    expect(resolved.startMode).toBe('managed')
  })
})
