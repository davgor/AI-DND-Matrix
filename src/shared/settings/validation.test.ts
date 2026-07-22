import { describe, expect, it } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from './types'
import { redactProviderSettings, validateProviderSettings } from './validation'

describe('validateProviderSettings: claude mode', () => {
  it('passes once an API key is set', () => {
    const settings = { ...DEFAULT_PROVIDER_SETTINGS, mode: 'claude' as const, claudeApiKey: 'sk-ant-test' }
    expect(validateProviderSettings(settings)).toEqual([])
  })

  it('requires a claude API key', () => {
    const settings = { ...DEFAULT_PROVIDER_SETTINGS, mode: 'claude' as const, claudeApiKey: '' }
    const errors = validateProviderSettings(settings)
    expect(errors).toEqual([{ field: 'claudeApiKey', message: 'Claude API key is required.' }])
  })

  it('allows an empty draft key when claudeApiKeySet is true', () => {
    const settings = { ...DEFAULT_PROVIDER_SETTINGS, mode: 'claude' as const, claudeApiKey: '' }
    expect(validateProviderSettings(settings, { claudeApiKeySet: true })).toEqual([])
  })

  it('requires a claude model', () => {
    const settings = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'claude' as const,
      claudeApiKey: 'sk-ant-test',
      claudeModel: ''
    }
    expect(validateProviderSettings(settings)).toEqual([
      { field: 'claudeModel', message: 'Claude model is required.' }
    ])
  })

  it('does not validate fields belonging to a mode that is not selected', () => {
    const settings = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'claude' as const,
      claudeApiKey: 'sk-ant-test',
      player2BaseUrl: 'not-a-url',
      llamaCppBaseUrl: ''
    }
    expect(validateProviderSettings(settings)).toEqual([])
  })
})

describe('validateProviderSettings: openai mode', () => {
  it('requires an API key and model', () => {
    const settings = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'openai' as const,
      openaiApiKey: '',
      openaiModel: ''
    }
    expect(validateProviderSettings(settings)).toEqual([
      { field: 'openaiApiKey', message: 'OpenAI API key is required.' },
      { field: 'openaiModel', message: 'OpenAI model is required.' }
    ])
  })

  it('passes with key and model', () => {
    const settings = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'openai' as const,
      openaiApiKey: 'sk-test',
      openaiModel: 'gpt-4.1-mini'
    }
    expect(validateProviderSettings(settings)).toEqual([])
  })
})

describe('validateProviderSettings: gemini mode', () => {
  it('requires an API key', () => {
    const settings = { ...DEFAULT_PROVIDER_SETTINGS, mode: 'gemini' as const, geminiApiKey: '' }
    expect(validateProviderSettings(settings)).toContainEqual({
      field: 'geminiApiKey',
      message: 'Gemini API key is required.'
    })
  })
})

describe('validateProviderSettings: grok mode', () => {
  it('requires an API key', () => {
    const settings = { ...DEFAULT_PROVIDER_SETTINGS, mode: 'grok' as const, grokApiKey: '' }
    expect(validateProviderSettings(settings)).toContainEqual({
      field: 'grokApiKey',
      message: 'Grok API key is required.'
    })
  })
})

describe('validateProviderSettings: player2 mode', () => {
  it('requires a valid player2BaseUrl', () => {
    const settings = { ...DEFAULT_PROVIDER_SETTINGS, mode: 'player2' as const, player2BaseUrl: 'not-a-url' }
    const errors = validateProviderSettings(settings)
    expect(errors).toEqual([{ field: 'player2BaseUrl', message: 'Enter a valid URL, e.g. http://127.0.0.1:4315.' }])
  })
})

describe('validateProviderSettings: llamacpp mode', () => {
  it('requires a valid llamaCppBaseUrl', () => {
    const settings = { ...DEFAULT_PROVIDER_SETTINGS, mode: 'llamacpp' as const, llamaCppBaseUrl: '' }
    const errors = validateProviderSettings(settings)
    expect(errors).toContainEqual({
      field: 'llamaCppBaseUrl',
      message: 'Enter a valid URL, e.g. http://127.0.0.1:8080.'
    })
  })

  it('requires server path and model path when start mode is managed without catalog', () => {
    const settings = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'llamacpp' as const,
      llamaCppStartMode: 'managed' as const,
      llamaCppServerPath: '',
      llamaCppModelPath: ''
    }
    const errors = validateProviderSettings(settings)
    expect(errors).toContainEqual({
      field: 'llamaCppServerPath',
      message: 'Managed mode requires a path to the llama-server executable.'
    })
    expect(errors).toContainEqual({
      field: 'llamaCppModelPath',
      message: 'Managed mode requires a path to a .gguf model file.'
    })
  })

  it('allows managed mode without manual model path when catalog download is ready', () => {
    const settings = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'llamacpp' as const,
      llamaCppStartMode: 'managed' as const,
      llamaCppServerPath: '',
      llamaCppModelPath: '',
      llamaCppCatalogModelId: 'qwen25-7b-instruct-q4-k-m',
      llamaCppDownloadState: 'ready' as const
    }
    expect(validateProviderSettings(settings)).toEqual([])
  })

  it('does not require server/model paths when start mode is attach', () => {
    const settings = {
      ...DEFAULT_PROVIDER_SETTINGS,
      mode: 'llamacpp' as const,
      llamaCppStartMode: 'attach' as const,
      llamaCppServerPath: '',
      llamaCppModelPath: ''
    }
    expect(validateProviderSettings(settings)).toEqual([])
  })
})

describe('redactProviderSettings', () => {
  it('replaces all API keys with boolean flags and keeps every other field', () => {
    const settings = {
      ...DEFAULT_PROVIDER_SETTINGS,
      claudeApiKey: 'sk-ant-super-secret',
      openaiApiKey: 'sk-openai',
      geminiApiKey: 'gem-key',
      grokApiKey: 'grok-key'
    }
    const redacted = redactProviderSettings(settings)

    expect(redacted).not.toHaveProperty('claudeApiKey')
    expect(redacted).not.toHaveProperty('openaiApiKey')
    expect(redacted).not.toHaveProperty('geminiApiKey')
    expect(redacted).not.toHaveProperty('grokApiKey')
    expect(redacted.claudeApiKeySet).toBe(true)
    expect(redacted.openaiApiKeySet).toBe(true)
    expect(redacted.geminiApiKeySet).toBe(true)
    expect(redacted.grokApiKeySet).toBe(true)
    expect(redacted.claudeModel).toBe(settings.claudeModel)
  })

  it('reports claudeApiKeySet as false when no key is stored', () => {
    const redacted = redactProviderSettings({ ...DEFAULT_PROVIDER_SETTINGS, claudeApiKey: '' })
    expect(redacted.claudeApiKeySet).toBe(false)
  })
})
