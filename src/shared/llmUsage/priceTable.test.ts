import { describe, expect, it } from 'vitest'
import { DEFAULT_PRICE_TABLE, lookupModelPrice, priceTableKey } from './priceTable'

describe('priceTable', () => {
  it('builds stable provider:model keys', () => {
    expect(priceTableKey('claude', 'claude-sonnet-4-6')).toBe('claude:claude-sonnet-4-6')
  })

  it('returns configured Claude Sonnet pricing by default', () => {
    const price = lookupModelPrice(DEFAULT_PRICE_TABLE, 'claude', 'claude-sonnet-4-6')
    expect(price.inputPerMillionUsd).toBeGreaterThan(0)
    expect(price.outputPerMillionUsd).toBeGreaterThan(0)
  })

  it('treats player2 and llamacpp as zero cost', () => {
    expect(lookupModelPrice(DEFAULT_PRICE_TABLE, 'player2', 'any-model')).toEqual({
      inputPerMillionUsd: 0,
      outputPerMillionUsd: 0
    })
    expect(lookupModelPrice(DEFAULT_PRICE_TABLE, 'llamacpp', 'local.gguf')).toEqual({
      inputPerMillionUsd: 0,
      outputPerMillionUsd: 0
    })
  })
})
