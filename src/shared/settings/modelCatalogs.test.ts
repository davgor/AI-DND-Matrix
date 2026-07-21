import { describe, expect, it } from 'vitest'
import {
  CUSTOM_MODEL_OPTION_VALUE,
  DEFAULT_CLOUD_MODELS,
  MODEL_CATALOGS,
  isCatalogModel,
  resolveModelSelection,
  type CloudProviderId
} from './modelCatalogs'

const PROVIDERS: CloudProviderId[] = ['claude', 'openai', 'gemini', 'grok']

describe('MODEL_CATALOGS', () => {
  it('lists entries with non-empty model ids for every cloud provider', () => {
    for (const provider of PROVIDERS) {
      const entries = MODEL_CATALOGS[provider]
      expect(entries.length).toBeGreaterThan(0)
      for (const entry of entries) {
        expect(entry.id.trim()).not.toBe('')
        expect(entry.label.trim()).not.toBe('')
      }
    }
  })
})

describe('DEFAULT_CLOUD_MODELS', () => {
  it('locks mid-tier defaults that exist in each catalog', () => {
    expect(DEFAULT_CLOUD_MODELS).toEqual({
      claude: 'claude-sonnet-4-6',
      openai: 'gpt-4.1-mini',
      gemini: 'gemini-2.5-flash',
      grok: 'grok-3'
    })
    for (const provider of PROVIDERS) {
      expect(isCatalogModel(provider, DEFAULT_CLOUD_MODELS[provider])).toBe(true)
    }
  })
})

describe('resolveModelSelection', () => {
  it('selects a catalog id when the model is curated', () => {
    expect(resolveModelSelection('openai', 'gpt-4.1-mini')).toEqual({
      selection: 'gpt-4.1-mini',
      customId: ''
    })
  })

  it('uses the Custom sentinel for unknown model ids', () => {
    expect(resolveModelSelection('openai', 'my-fine-tune')).toEqual({
      selection: CUSTOM_MODEL_OPTION_VALUE,
      customId: 'my-fine-tune'
    })
  })
})
