import { describe, expect, it, vi } from 'vitest'
import { REFERENCE_LLAMACPP_CATALOG_ID } from '../../../shared/settings/llamaCppCatalog'
import {
  DEFAULT_PROVIDER_SETTINGS,
  type RedactedProviderSettings
} from '../../../shared/settings/types'
import { runLocalLlmFirstRunSetup } from './runLocalLlmFirstRunSetup'

function redacted(overrides: Partial<RedactedProviderSettings> = {}): RedactedProviderSettings {
  return {
    ...DEFAULT_PROVIDER_SETTINGS,
    claudeApiKeySet: false,
    openaiApiKeySet: false,
    geminiApiKeySet: false,
    grokApiKeySet: false,
    ...overrides
  }
}

describe('runLocalLlmFirstRunSetup success', () => {
  it('acquires, downloads, switches mode, and applies lifecycle', async () => {
    const calls: string[] = []
    const save = vi.fn(async (input: Record<string, unknown>) => {
      calls.push(`save:${String(input['llamaCppRuntimeBackend'] ?? input['mode'])}`)
      return redacted(input as Partial<RedactedProviderSettings>)
    })
    const result = await runLocalLlmFirstRunSetup({
      backend: 'vulkan',
      getSettings: async () => redacted(),
      saveSettings: save as never,
      acquireRuntime: async () => {
        calls.push('acquire')
        return { ok: true as const, serverPath: 'C:/runtime/llama-server.exe' }
      },
      downloadModel: async (id: string) => {
        calls.push(`download:${id}`)
        return { ok: true as const, modelPath: 'C:/models/qwen.gguf' }
      },
      applyLifecycle: async () => {
        calls.push('apply')
        return { ok: true, message: 'ready' }
      }
    })
    expect(result).toEqual({ ok: true })
    expect(calls[0]).toBe('save:vulkan')
    expect(calls).toContain('acquire')
    expect(calls).toContain(`download:${REFERENCE_LLAMACPP_CATALOG_ID}`)
    expect(calls.at(-1)).toBe('apply')
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: 'llamacpp',
        llamaCppStartMode: 'managed',
        llamaCppRuntimeBackend: 'vulkan',
        llamaCppServerPath: 'C:/runtime/llama-server.exe',
        llamaCppModelPath: 'C:/models/qwen.gguf'
      })
    )
  })
})

describe('runLocalLlmFirstRunSetup failures', () => {
  it('returns a failure message when acquire fails', async () => {
    const result = await runLocalLlmFirstRunSetup({
      backend: 'cpu',
      getSettings: async () => redacted(),
      saveSettings: async () => redacted(),
      acquireRuntime: async () => ({
        ok: false as const,
        message: 'boom',
        recoveryHint: 'retry'
      }),
      downloadModel: async () => ({ ok: true as const, modelPath: 'x' }),
      applyLifecycle: async () => ({ ok: true, message: 'ok' })
    })
    expect(result).toEqual({ ok: false, message: 'boom retry' })
  })
})
