import { describe, expect, it } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../shared/settings/types'
import type { AppConfig } from './config'
import { resolveLlamaCppLifecycleConfig } from './settingsRuntime'

const envConfig: AppConfig = {
  agentProvider: 'player2',
  player2BaseUrl: 'http://127.0.0.1:4315',
  claudeApiKey: undefined,
  claudeModel: 'claude-sonnet-4-6',
  openaiApiKey: undefined,
  openaiModel: 'gpt-4.1-mini',
  geminiApiKey: undefined,
  geminiModel: 'gemini-2.5-flash',
  grokApiKey: undefined,
  grokModel: 'grok-3',
  llamaCppBaseUrl: 'http://127.0.0.1:8080',
  llamaCppServerPath: undefined,
  llamaCppModelPath: undefined,
  llamaCppCtxSize: 8192,
  llamaCppGpuLayers: 'all',
  llamaCppStartMode: 'attach'
}

describe('settings → lifecycle mapping (020.20)', () => {
  it('maps ready downloaded catalog paths from persisted settings', () => {
    const life = resolveLlamaCppLifecycleConfig(envConfig, {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'llamacpp',
      llamaCppStartMode: 'managed',
      llamaCppServerPath: 'C:\\userData\\llamacpp\\runtime\\llama-server.exe',
      llamaCppModelPath: 'C:\\userData\\llamacpp\\models\\qwen25-7b-instruct-q4-k-m.gguf',
      llamaCppCatalogModelId: 'qwen25-7b-instruct-q4-k-m',
      llamaCppDownloadState: 'ready',
      llamaCppCtxSize: 8192,
      llamaCppGpuLayers: 'all'
    })
    expect(life.startMode).toBe('managed')
    expect(life.serverPath).toContain('llama-server')
    expect(life.modelPath).toContain('qwen25-7b-instruct-q4-k-m.gguf')
  })

  it('surfaces missing-asset config when managed paths are empty', () => {
    const life = resolveLlamaCppLifecycleConfig(envConfig, {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'llamacpp',
      llamaCppStartMode: 'managed',
      llamaCppServerPath: '',
      llamaCppModelPath: '',
      llamaCppDownloadState: 'idle'
    })
    expect(life.serverPath).toBeUndefined()
    expect(life.modelPath).toBeUndefined()
    expect(life.startMode).toBe('managed')
  })
})
