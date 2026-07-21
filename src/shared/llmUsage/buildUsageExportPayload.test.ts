import { describe, expect, it } from 'vitest'
import type { LlmUsageEvent } from './types'
import { aggregateUsageReport } from './aggregateUsageReport'
import { buildUsageExportPayload, formatUsageExportFilename } from './buildUsageExportPayload'
import { DEFAULT_PRICE_TABLE } from './priceTable'

const FORBIDDEN_KEYS = ['apiKey', 'claudeApiKey', 'prompt', 'systemPrompt', 'messages'] as const

function sampleEvent(): LlmUsageEvent {
  return {
    id: 'evt-1',
    providerName: 'claude',
    modelId: 'claude-sonnet-4-6',
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    purpose: 'play.narration',
    bucket: 'play',
    campaignId: 'camp-1',
    characterId: null,
    createdAt: '2026-07-20T12:00:00.000Z',
    outcome: 'success',
    errorMessage: null
  }
}

describe('formatUsageExportFilename', () => {
  it('uses UTC YYYYMMDD-HHmmss for human sorting', () => {
    const name = formatUsageExportFilename(new Date('2026-07-20T15:04:05.000Z'))
    expect(name).toBe('ai-ttrpg-usage-20260720-150405.json')
  })
})

describe('buildUsageExportPayload', () => {
  it('includes required metadata and summary rollups', () => {
    const events = [sampleEvent()]
    const summary = aggregateUsageReport(events, DEFAULT_PRICE_TABLE)
    const payload = buildUsageExportPayload({
      events,
      summary,
      meta: {
        exportedAt: '2026-07-20T12:00:00.000Z',
        appVersion: '0.28.0',
        platform: 'win32',
        providerMode: 'claude',
        campaignIdFilter: null
      }
    })

    expect(payload.schemaVersion).toBe(1)
    expect(payload.exportedAt).toBe('2026-07-20T12:00:00.000Z')
    expect(payload.appVersion).toBe('0.28.0')
    expect(payload.platform).toBe('win32')
    expect(payload.providerMode).toBe('claude')
    expect(payload.campaignIdFilter).toBeNull()
    expect(payload.summary.byPurpose).toHaveLength(1)
    expect(payload.events).toEqual(events)
  })

  it('serializes without secrets or prompt fields', () => {
    const events = [sampleEvent()]
    const summary = aggregateUsageReport(events, DEFAULT_PRICE_TABLE)
    const payload = buildUsageExportPayload({
      events,
      summary,
      meta: {
        exportedAt: '2026-07-20T12:00:00.000Z',
        appVersion: '0.28.0',
        platform: 'darwin',
        providerMode: 'player2',
        campaignIdFilter: 'camp-1'
      }
    })

    const json = JSON.stringify(payload)
    for (const key of FORBIDDEN_KEYS) {
      expect(json.includes(`"${key}"`)).toBe(false)
    }
    expect(json.includes('sk-ant')).toBe(false)
  })
})
