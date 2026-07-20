import type { ModelPrice } from './priceTable'

export type CostEstimate = { status: 'known'; usd: number } | { status: 'unknown' }

export function estimateCost(
  tokens: { inputTokens: number | null; outputTokens: number | null },
  price: ModelPrice
): CostEstimate {
  if (tokens.inputTokens === null || tokens.outputTokens === null) {
    return { status: 'unknown' }
  }

  const usd =
    (tokens.inputTokens / 1_000_000) * price.inputPerMillionUsd +
    (tokens.outputTokens / 1_000_000) * price.outputPerMillionUsd

  return { status: 'known', usd }
}

export function mergeCostEstimates(left: CostEstimate, right: CostEstimate): CostEstimate {
  if (left.status === 'unknown' || right.status === 'unknown') {
    return { status: 'unknown' }
  }
  return { status: 'known', usd: left.usd + right.usd }
}

export function costEstimateToUsd(value: CostEstimate): number | 'unknown' {
  return value.status === 'known' ? value.usd : 'unknown'
}
