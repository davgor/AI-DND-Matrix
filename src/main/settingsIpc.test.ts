import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../shared/settings/types'
import type { SecretCodec } from './settingsStore'
import {
  checkLlamaRuntimeConfig,
  getRedactedSettings,
  saveProviderSettings,
  SettingsValidationFailedError,
  testPlayer2Connection
} from './settingsIpc'

const codec: SecretCodec = {
  available: true,
  encrypt: (plain) => Buffer.from(plain, 'utf-8').toString('base64'),
  decrypt: (encoded) => Buffer.from(encoded, 'base64').toString('utf-8')
}

let dir: string
let filePath: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'settings-ipc-test-'))
  filePath = join(dir, 'settings.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('getRedactedSettings', () => {
  it('never includes the raw claudeApiKey', () => {
    saveProviderSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS, {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'claude',
      claudeApiKey: 'sk-ant-secret'
    })

    const redacted = getRedactedSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
    expect(redacted).not.toHaveProperty('claudeApiKey')
    expect(redacted.claudeApiKeySet).toBe(true)
  })
})

describe('saveProviderSettings', () => {
  it('throws a typed validation error and does not persist invalid settings', () => {
    expect(() =>
      saveProviderSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS, {
        ...DEFAULT_PROVIDER_SETTINGS,
        mode: 'claude',
        claudeApiKey: ''
      })
    ).toThrow(SettingsValidationFailedError)

    const redacted = getRedactedSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
    expect(redacted.claudeApiKeySet).toBe(false)
  })

  it('preserves the existing claudeApiKey when the save input omits it', () => {
    saveProviderSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS, {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'claude',
      claudeApiKey: 'sk-ant-keep-me'
    })

    const { claudeApiKey: _omitted, ...withoutApiKey } = DEFAULT_PROVIDER_SETTINGS
    saveProviderSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS, {
      ...withoutApiKey,
      mode: 'claude',
      claudeModel: 'claude-new-model'
    })

    const redacted = getRedactedSettings(filePath, codec, DEFAULT_PROVIDER_SETTINGS)
    expect(redacted.claudeApiKeySet).toBe(true)
    expect(redacted.claudeModel).toBe('claude-new-model')
  })
})

describe('testPlayer2Connection', () => {
  it('returns ok when the generation call succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { role: 'assistant', content: 'pong' } }] })
    }))

    const result = await testPlayer2Connection('http://127.0.0.1:4315')
    expect(result.ok).toBe(true)
    vi.unstubAllGlobals()
  })

  it('returns a clear diagnostic message without throwing when unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    const result = await testPlayer2Connection('http://127.0.0.1:4315')
    expect(result.ok).toBe(false)
    expect(result.message.length).toBeGreaterThan(0)
    vi.unstubAllGlobals()
  })

  it('treats a truncated 1-token ping as a successful connectivity check (040.14)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'po' }, finish_reason: 'length' }]
      })
    }))

    const result = await testPlayer2Connection('http://127.0.0.1:4315')
    expect(result.ok).toBe(true)
    vi.unstubAllGlobals()
  })
})

describe('checkLlamaRuntimeConfig', () => {
  it('reports ok when an attach-mode health check returns 200', async () => {
    const result = await checkLlamaRuntimeConfig(
      { ...DEFAULT_PROVIDER_SETTINGS, llamaCppStartMode: 'attach', llamaCppBaseUrl: 'http://127.0.0.1:8080' },
      { fetchHealth: async () => 200 }
    )
    expect(result.ok).toBe(true)
  })

  it('reports a typed failure when an attach-mode health check is unreachable', async () => {
    const result = await checkLlamaRuntimeConfig(
      { ...DEFAULT_PROVIDER_SETTINGS, llamaCppStartMode: 'attach', llamaCppBaseUrl: 'http://127.0.0.1:8080' },
      { fetchHealth: async () => 0 }
    )
    expect(result.ok).toBe(false)
  })

  it('reports a failure for managed mode when the server or model path does not exist', async () => {
    const result = await checkLlamaRuntimeConfig(
      {
        ...DEFAULT_PROVIDER_SETTINGS,
        llamaCppStartMode: 'managed',
        llamaCppServerPath: '/does/not/exist/llama-server',
        llamaCppModelPath: '/does/not/exist/model.gguf'
      },
      { pathExists: () => false }
    )
    expect(result.ok).toBe(false)
    expect(result.message).toContain('not found')
  })

  it('reports ok for managed mode when both paths exist', async () => {
    const result = await checkLlamaRuntimeConfig(
      {
        ...DEFAULT_PROVIDER_SETTINGS,
        llamaCppStartMode: 'managed',
        llamaCppServerPath: '/real/llama-server',
        llamaCppModelPath: '/real/model.gguf'
      },
      { pathExists: () => true }
    )
    expect(result.ok).toBe(true)
  })
})
