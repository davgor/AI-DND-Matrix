import type { UsageExportPayload, UsageReportSummary } from './reportTypes'
import type { LlmUsageEvent } from './types'

export interface UsageExportMeta {
  exportedAt: string
  appVersion: string
  platform: string
  providerMode: string
  campaignIdFilter: string | null
}

export interface BuildUsageExportPayloadInput {
  events: LlmUsageEvent[]
  summary: UsageReportSummary
  meta: UsageExportMeta
}

/** UTC timestamp in filename for consistent cross-timezone sorting. */
export function formatUsageExportFilename(date: Date = new Date()): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `ai-ttrpg-usage-${year}${month}${day}-${hours}${minutes}${seconds}.json`
}

export function buildUsageExportPayload(input: BuildUsageExportPayloadInput): UsageExportPayload {
  return {
    schemaVersion: 1,
    exportedAt: input.meta.exportedAt,
    appVersion: input.meta.appVersion,
    platform: input.meta.platform,
    providerMode: input.meta.providerMode,
    campaignIdFilter: input.meta.campaignIdFilter,
    summary: input.summary,
    events: input.events.map(toExportEvent)
  }
}

function toExportEvent(event: LlmUsageEvent): LlmUsageEvent {
  return {
    id: event.id,
    providerName: event.providerName,
    modelId: event.modelId,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    totalTokens: event.totalTokens,
    purpose: event.purpose,
    bucket: event.bucket,
    campaignId: event.campaignId,
    characterId: event.characterId,
    createdAt: event.createdAt,
    outcome: event.outcome,
    errorMessage: event.errorMessage
  }
}
