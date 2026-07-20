import { describe, expect, it } from 'vitest'
import { estimateCost } from './estimateCost'

const samplePrice = { inputPerMillionUsd: 3, outputPerMillionUsd: 15 }

describe('estimateCost', () => {
  it('computes USD from token counts and per-million rates', () => {
    const result = estimateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, samplePrice)
    expect(result).toEqual({ status: 'known', usd: 18 })
  })

  it('returns unknown when input tokens are null', () => {
    expect(estimateCost({ inputTokens: null, outputTokens: 100 }, samplePrice)).toEqual({
      status: 'unknown'
    })
  })

  it('returns unknown when output tokens are null', () => {
    expect(estimateCost({ inputTokens: 100, outputTokens: null }, samplePrice)).toEqual({
      status: 'unknown'
    })
  })

  it('returns zero for zero-cost providers when tokens are known', () => {
    const result = estimateCost(
      { inputTokens: 50_000, outputTokens: 10_000 },
      { inputPerMillionUsd: 0, outputPerMillionUsd: 0 }
    )
    expect(result).toEqual({ status: 'known', usd: 0 })
  })
})
