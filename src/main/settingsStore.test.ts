import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../shared/settings/types'
import { loadSettings, loadSettingsOrNull, saveSettings, type SecretCodec } from './settingsStore'

const passthroughCodec: SecretCodec = {
  available: true,
  encrypt: (plain) => Buffer.from(plain, 'utf-8').toString('base64'),
  decrypt: (encoded) => Buffer.from(encoded, 'base64').toString('utf-8')
}

let dir: string
let filePath: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'settings-store-test-'))
  filePath = join(dir, 'settings.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('loadSettings: basics', () => {
  it('returns the provided fallback when no settings file exists yet', () => {
    const settings = loadSettings(filePath, passthroughCodec, DEFAULT_PROVIDER_SETTINGS)
    expect(settings).toEqual(DEFAULT_PROVIDER_SETTINGS)
  })

  it('round-trips a saved settings file, decrypting the API key', () => {
    saveSettings(filePath, passthroughCodec, {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'claude',
      claudeApiKey: 'sk-ant-super-secret'
    })

    const loaded = loadSettings(filePath, passthroughCodec, DEFAULT_PROVIDER_SETTINGS)
    expect(loaded.claudeApiKey).toBe('sk-ant-super-secret')
    expect(loaded.mode).toBe('claude')
  })

  it('backfills fields missing from an older settings file with the fallback', () => {
    writeFileSync(
      filePath,
      JSON.stringify({ claudeApiKeyEncrypted: '', rest: { player2BaseUrl: 'http://custom:9999' } }),
      'utf-8'
    )

    const loaded = loadSettings(filePath, passthroughCodec, {
      ...DEFAULT_PROVIDER_SETTINGS,
      llamaCppCtxSize: 4096
    })
    expect(loaded.player2BaseUrl).toBe('http://custom:9999')
    expect(loaded.llamaCppCtxSize).toBe(4096)
  })
})

describe('loadSettings: multi-cloud secrets', () => {
  it('never stores API keys in plain text on disk', () => {
    saveSettings(filePath, passthroughCodec, {
      ...DEFAULT_PROVIDER_SETTINGS,
      claudeApiKey: 'sk-ant-super-secret',
      openaiApiKey: 'sk-openai-secret',
      geminiApiKey: 'gem-secret',
      grokApiKey: 'grok-secret'
    })

    const raw = readFileSync(filePath, 'utf-8')
    expect(raw).not.toContain('sk-ant-super-secret')
    expect(raw).not.toContain('sk-openai-secret')
    expect(raw).not.toContain('gem-secret')
    expect(raw).not.toContain('grok-secret')
    expect(raw).toContain(Buffer.from('sk-ant-super-secret', 'utf-8').toString('base64'))
    expect(raw).toContain(Buffer.from('sk-openai-secret', 'utf-8').toString('base64'))
  })

  it('round-trips openai/gemini/grok encrypted keys', () => {
    saveSettings(filePath, passthroughCodec, {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'openai',
      openaiApiKey: 'sk-openai-roundtrip',
      geminiApiKey: 'gem-roundtrip',
      grokApiKey: 'grok-roundtrip'
    })

    const loaded = loadSettings(filePath, passthroughCodec, DEFAULT_PROVIDER_SETTINGS)
    expect(loaded.openaiApiKey).toBe('sk-openai-roundtrip')
    expect(loaded.geminiApiKey).toBe('gem-roundtrip')
    expect(loaded.grokApiKey).toBe('grok-roundtrip')
  })
})

describe('loadSettingsOrNull', () => {
  it('returns null when no settings file has ever been saved', () => {
    expect(loadSettingsOrNull(filePath, passthroughCodec, DEFAULT_PROVIDER_SETTINGS)).toBeNull()
  })

  it('returns the loaded settings once a file exists', () => {
    saveSettings(filePath, passthroughCodec, { ...DEFAULT_PROVIDER_SETTINGS, mode: 'player2' })
    expect(loadSettingsOrNull(filePath, passthroughCodec, DEFAULT_PROVIDER_SETTINGS)?.mode).toBe('player2')
  })
})

describe('saveSettings', () => {
  it('falls back to plain text with no codec wrapping when encryption is unavailable', () => {
    const unavailableCodec: SecretCodec = {
      available: false,
      encrypt: (plain) => plain,
      decrypt: (encoded) => encoded
    }
    saveSettings(filePath, unavailableCodec, { ...DEFAULT_PROVIDER_SETTINGS, claudeApiKey: 'sk-ant-plain' })

    const loaded = loadSettings(filePath, unavailableCodec, DEFAULT_PROVIDER_SETTINGS)
    expect(loaded.claudeApiKey).toBe('sk-ant-plain')
  })

  it('round-trips catalog download fields without breaking manual model paths', () => {
    saveSettings(filePath, passthroughCodec, {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'llamacpp',
      llamaCppModelPath: 'C:\\models\\manual.gguf',
      llamaCppCatalogModelId: 'qwen25-7b-instruct-q4-k-m',
      llamaCppDownloadState: 'ready'
    })

    const loaded = loadSettings(filePath, passthroughCodec, DEFAULT_PROVIDER_SETTINGS)
    expect(loaded.llamaCppModelPath).toBe('C:\\models\\manual.gguf')
    expect(loaded.llamaCppCatalogModelId).toBe('qwen25-7b-instruct-q4-k-m')
    expect(loaded.llamaCppDownloadState).toBe('ready')
  })
})
