/** USD per 1M tokens for a provider model pair. */
export interface ModelPrice {
  inputPerMillionUsd: number
  outputPerMillionUsd: number
}

export type PriceTable = Record<string, ModelPrice>

/** Stable lookup key: `{providerName}:{modelId}`. */
export function priceTableKey(providerName: string, modelId: string): string {
  return `${providerName}:${modelId}`
}

/**
 * Default list prices for subscription modeling (epic 112).
 * Claude Sonnet 4.6 — update when Anthropic publishes new rates.
 * Local runtimes (player2, llamacpp) are treated as $0.
 */
export const DEFAULT_PRICE_TABLE: PriceTable = {
  'claude:claude-sonnet-4-6': {
    inputPerMillionUsd: 3,
    outputPerMillionUsd: 15
  },
  'claude:claude-sonnet-4-20250514': {
    inputPerMillionUsd: 3,
    outputPerMillionUsd: 15
  }
}

const ZERO_PRICE: ModelPrice = { inputPerMillionUsd: 0, outputPerMillionUsd: 0 }

export function lookupModelPrice(
  priceTable: PriceTable,
  providerName: string,
  modelId: string
): ModelPrice {
  const configured = priceTable[priceTableKey(providerName, modelId)]
  if (configured) {
    return configured
  }
  if (providerName === 'player2' || providerName === 'llamacpp') {
    return ZERO_PRICE
  }
  return ZERO_PRICE
}
