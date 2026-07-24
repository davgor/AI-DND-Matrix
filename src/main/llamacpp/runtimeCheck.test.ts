import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../../shared/settings/types'
import { checkLlamaRuntimeConfig } from './runtimeCheck'

const ATTACH = {
  ...DEFAULT_PROVIDER_SETTINGS,
  llamaCppStartMode: 'attach' as const,
  llamaCppBaseUrl: 'http://127.0.0.1:8080'
}

const MANAGED = {
  ...DEFAULT_PROVIDER_SETTINGS,
  llamaCppStartMode: 'managed' as const,
  llamaCppBaseUrl: 'http://127.0.0.1:8080',
  llamaCppServerPath: 'C:\\runtime\\llama-server.exe',
  llamaCppModelPath: 'C:\\models\\model.gguf'
}

describe('checkLlamaRuntimeConfig health', () => {
  it('fails with verbose detail when health is unreachable', async () => {
    const result = await checkLlamaRuntimeConfig(ATTACH, {
      fetchHealth: async () => ({ status: 0, error: 'fetch failed' }),
      pingChat: async () => ({ ok: false, error: 'skipped' })
    })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/mode: attach/i)
    expect(result.message).toMatch(/baseUrl: http:\/\/127\.0\.0\.1:8080/)
    expect(result.message).toMatch(/health:/i)
    expect(result.message).toMatch(/fetch failed/)
  })
})

describe('checkLlamaRuntimeConfig managed paths', () => {
  it('fails with path diagnostics when files are missing', async () => {
    const result = await checkLlamaRuntimeConfig(MANAGED, {
      pathExists: () => false,
      fetchHealth: async () => ({ status: 0 }),
      pingChat: async () => ({ ok: false, error: 'skipped' })
    })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/mode: managed/i)
    expect(result.message).toMatch(/serverPath:/i)
    expect(result.message).toMatch(/missing/i)
    expect(result.message).toMatch(/modelPath:/i)
  })
})

describe('checkLlamaRuntimeConfig ping', () => {
  it('succeeds when health is 200 and chat ping works', async () => {
    const result = await checkLlamaRuntimeConfig(ATTACH, {
      fetchHealth: async () => ({ status: 200 }),
      pingChat: async () => ({
        ok: true,
        status: 200,
        latencyMs: 12,
        preview: 'ok'
      })
    })
    expect(result.ok).toBe(true)
    expect(result.message).toMatch(/healthy/i)
    expect(result.message).toMatch(/ping: ok/i)
    expect(result.message).toMatch(/12 ms/i)
  })

  it('treats a truncated 1-token ping as success', async () => {
    const result = await checkLlamaRuntimeConfig(ATTACH, {
      fetchHealth: async () => ({ status: 200 }),
      pingChat: async () => ({
        ok: true,
        status: 200,
        latencyMs: 8,
        truncated: true,
        preview: 'p'
      })
    })
    expect(result.ok).toBe(true)
    expect(result.message).toMatch(/truncated/i)
  })

  it('includes HTTP status and response body on chat ping failure', async () => {
    const result = await checkLlamaRuntimeConfig(ATTACH, {
      fetchHealth: async () => ({ status: 200 }),
      pingChat: async () => ({
        ok: false,
        status: 500,
        latencyMs: 4,
        body: '{"error":{"message":"failed to load model"}}',
        error: 'HTTP 500'
      })
    })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/HTTP 500/)
    expect(result.message).toMatch(/failed to load model/)
    expect(result.message).toMatch(/ping:/i)
  })
})

describe('defaultLlamaChatPing', () => {
  it('captures non-OK response bodies for debugging', async () => {
    const { defaultLlamaChatPing } = await import('./runtimeCheck')
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => '{"error":"loading"}'
    }))
    const result = await defaultLlamaChatPing('http://127.0.0.1:8080', fetchImpl as unknown as typeof fetch)
    expect(result.ok).toBe(false)
    expect(result.status).toBe(503)
    expect(result.body).toContain('loading')
  })
})
