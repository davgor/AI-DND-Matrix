import type { LlmUsageAggregationSeed } from './reportTypes'
import { costEstimateToUsd, estimateCost, mergeCostEstimates } from './estimateCost'
import { addNullableTokenSum } from './tokenSums'
import { lookupModelPrice, type PriceTable } from './priceTable'
import type { UsageBucketRollup, UsagePurposeRollup, UsageReportSummary } from './reportTypes'
import type { LlmPurposeBucket, LlmPurposeId, LlmUsageEvent } from './types'

type RollupAccumulator = {
  bucket: LlmPurposeBucket
  eventCount: number
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  cost: ReturnType<typeof estimateCost>
}

function emptyAccumulator(bucket: LlmPurposeBucket): RollupAccumulator {
  return {
    bucket,
    eventCount: 0,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    cost: { status: 'known', usd: 0 }
  }
}

function isUsageEvent(item: LlmUsageEvent | LlmUsageAggregationSeed): item is LlmUsageEvent {
  return 'providerName' in item
}

function eventCost(event: LlmUsageEvent, priceTable: PriceTable): ReturnType<typeof estimateCost> {
  const price = lookupModelPrice(priceTable, event.providerName, event.modelId)
  return estimateCost(
    { inputTokens: event.inputTokens, outputTokens: event.outputTokens },
    price
  )
}

function applyEvent(
  acc: RollupAccumulator,
  event: LlmUsageEvent,
  priceTable: PriceTable
): RollupAccumulator {
  return {
    bucket: event.bucket,
    eventCount: acc.eventCount + 1,
    inputTokens: addNullableTokenSum(acc.inputTokens, event.inputTokens),
    outputTokens: addNullableTokenSum(acc.outputTokens, event.outputTokens),
    totalTokens: addNullableTokenSum(acc.totalTokens, event.totalTokens),
    cost: mergeCostEstimates(acc.cost, eventCost(event, priceTable))
  }
}

function applySeed(acc: RollupAccumulator, seed: LlmUsageAggregationSeed): RollupAccumulator {
  return {
    bucket: seed.bucket,
    eventCount: acc.eventCount + seed.eventCount,
    inputTokens: addNullableTokenSum(acc.inputTokens, seed.inputTokens),
    outputTokens: addNullableTokenSum(acc.outputTokens, seed.outputTokens),
    totalTokens: addNullableTokenSum(acc.totalTokens, seed.totalTokens),
    cost: mergeCostEstimates(acc.cost, { status: 'unknown' })
  }
}

function toPurposeRollup(purpose: LlmPurposeId, acc: RollupAccumulator): UsagePurposeRollup {
  return {
    purpose,
    bucket: acc.bucket,
    eventCount: acc.eventCount,
    inputTokens: acc.inputTokens,
    outputTokens: acc.outputTokens,
    totalTokens: acc.totalTokens,
    estimatedCostUsd: costEstimateToUsd(acc.cost)
  }
}

function toBucketRollup(bucket: LlmPurposeBucket, acc: RollupAccumulator): UsageBucketRollup {
  return {
    bucket,
    eventCount: acc.eventCount,
    inputTokens: acc.inputTokens,
    outputTokens: acc.outputTokens,
    totalTokens: acc.totalTokens,
    estimatedCostUsd: costEstimateToUsd(acc.cost)
  }
}

const BUCKET_ORDER: LlmPurposeBucket[] = ['setup', 'play', 'meta']

export function aggregateUsageReport(
  items: LlmUsageEvent[] | LlmUsageAggregationSeed[],
  priceTable: PriceTable
): UsageReportSummary {
  const byPurpose = new Map<LlmPurposeId, RollupAccumulator>()
  const byBucket = new Map<LlmPurposeBucket, RollupAccumulator>()

  for (const item of items) {
    const purposeAcc = byPurpose.get(item.purpose) ?? emptyAccumulator(item.bucket)
    const bucketAcc = byBucket.get(item.bucket) ?? emptyAccumulator(item.bucket)

    byPurpose.set(
      item.purpose,
      isUsageEvent(item) ? applyEvent(purposeAcc, item, priceTable) : applySeed(purposeAcc, item)
    )
    byBucket.set(
      item.bucket,
      isUsageEvent(item) ? applyEvent(bucketAcc, item, priceTable) : applySeed(bucketAcc, item)
    )
  }

  return {
    byPurpose: [...byPurpose.entries()]
      .map(([purpose, acc]) => toPurposeRollup(purpose, acc))
      .sort((a, b) => a.purpose.localeCompare(b.purpose)),
    byBucket: BUCKET_ORDER.filter((bucket) => byBucket.has(bucket)).map((bucket) =>
      toBucketRollup(bucket, byBucket.get(bucket)!)
    )
  }
}

export function formatEstimatedCostUsd(value: number | 'unknown'): string {
  if (value === 'unknown') {
    return 'unknown'
  }
  if (value === 0) {
    return '$0.00'
  }
  return `$${value.toFixed(4)}`
}
