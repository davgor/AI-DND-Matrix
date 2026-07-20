import { describe, expect, it } from 'vitest'
import type { ProviderMode } from '../../../shared/settings/types'
import { providerSectionKind } from './providerSectionKind'

const MODES: ProviderMode[] = ['claude', 'openai', 'gemini', 'grok', 'player2', 'llamacpp']

describe('providerSectionKind', () => {
  it('maps each provider mode to a matching field group', () => {
    for (const mode of MODES) {
      expect(providerSectionKind(mode)).toBe(mode)
    }
  })
})
