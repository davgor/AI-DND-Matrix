import type { LlmPurposeBucket, LlmPurposeId, LlmUsageEvent } from './types'

export interface LlmUsageAggregationSeed {
  purpose: LlmPurposeId
  bucket: LlmPurposeBucket
  eventCount: number
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
}

export type EstimatedCostUsd = number | 'unknown'

export interface UsagePurposeRollup {
  purpose: LlmPurposeId
  bucket: LlmPurposeBucket
  eventCount: number
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  estimatedCostUsd: EstimatedCostUsd
}

export interface UsageBucketRollup {
  bucket: LlmPurposeBucket
  eventCount: number
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  estimatedCostUsd: EstimatedCostUsd
}

export interface UsageReportSummary {
  byPurpose: UsagePurposeRollup[]
  byBucket: UsageBucketRollup[]
}

export interface UsageExportPayload {
  schemaVersion: 1
  exportedAt: string
  appVersion: string
  platform: string
  providerMode: string
  campaignIdFilter: string | null
  summary: UsageReportSummary
  events: LlmUsageEvent[]
}

export interface LlmUsageRecentTotals {
  range: 'last_7_days' | 'all_time'
  from: string | null
  to: string | null
  summary: UsageReportSummary
}

export type LlmUsageExportResult =
  | { ok: true; path: string }
  | { ok: false; canceled: true }
  | { ok: false; error: string }
