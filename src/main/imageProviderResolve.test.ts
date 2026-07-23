import { describe, expect, it } from 'vitest'
import { DEFAULT_PROVIDER_SETTINGS } from '../shared/settings/types'
import { resolveImageProviderFromSettings } from './imageProviderResolve'

describe('resolveImageProviderFromSettings', () => {
  it('null when disabled', () => {
    expect(resolveImageProviderFromSettings(DEFAULT_PROVIDER_SETTINGS)).toBeNull()
  })
})
