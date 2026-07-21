import { describe, expect, it } from 'vitest'
import type { LlmUsageAggregationSeed } from './reportTypes'
import type { LlmUsageEvent } from './types'
import { aggregateUsageReport } from './aggregateUsageReport'
import { DEFAULT_PRICE_TABLE } from './priceTable'

function claudeEvent(overrides: Partial<LlmUsageEvent> = {}): LlmUsageEvent {
  return {
    id: 'evt-1',
    providerName: 'claude',
    modelId: 'claude-sonnet-4-6',
    inputTokens: 1_000,
    outputTokens: 500,
    totalTokens: 1_500,
    purpose: 'play.narration',
    bucket: 'play',
    campaignId: 'camp-1',
    characterId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    outcome: 'success',
    errorMessage: null,
    ...overrides
  }
}

describe('aggregateUsageReport from events', () => {
  it('totals by purpose and bucket with call counts and tokens', () => {
    const events = [
      claudeEvent({ id: 'a', purpose: 'play.narration', bucket: 'play' }),
      claudeEvent({
        id: 'b',
        purpose: 'campaign.world',
        bucket: 'setup',
        inputTokens: 2_000,
        outputTokens: 1_000,
        totalTokens: 3_000
      }),
      claudeEvent({ id: 'c', purpose: 'play.combat', bucket: 'play' })
    ]

    const report = aggregateUsageReport(events, DEFAULT_PRICE_TABLE)

    expect(report.byPurpose).toHaveLength(3)
    expect(report.byBucket).toEqual([
      expect.objectContaining({ bucket: 'setup', eventCount: 1, inputTokens: 2_000 }),
      expect.objectContaining({ bucket: 'play', eventCount: 2, inputTokens: 2_000 })
    ])
  })

  it('marks cost unknown when any event in a group has null tokens', () => {
    const events = [
      claudeEvent({ id: 'a', inputTokens: 100, outputTokens: 50 }),
      claudeEvent({ id: 'b', inputTokens: null, outputTokens: 50 })
    ]

    const report = aggregateUsageReport(events, DEFAULT_PRICE_TABLE)
    expect(report.byBucket.find((row) => row.bucket === 'play')?.estimatedCostUsd).toBe('unknown')
  })

  it('sums known per-event costs within a bucket', () => {
    const events = [
      claudeEvent({ id: 'a', inputTokens: 1_000_000, outputTokens: 0 }),
      claudeEvent({ id: 'b', inputTokens: 0, outputTokens: 1_000_000 })
    ]

    const report = aggregateUsageReport(events, DEFAULT_PRICE_TABLE)
    const play = report.byBucket.find((row) => row.bucket === 'play')
    expect(play?.estimatedCostUsd).toBe(18)
  })
})

describe('aggregateUsageReport from seeds', () => {
  it('rolls up seed rows without per-event pricing (cost unknown)', () => {
    const seeds: LlmUsageAggregationSeed[] = [
      {
        purpose: 'play.narration',
        bucket: 'play',
        eventCount: 2,
        inputTokens: 500,
        outputTokens: 200,
        totalTokens: 700
      }
    ]

    const report = aggregateUsageReport(seeds, DEFAULT_PRICE_TABLE)
    expect(report.byPurpose[0]?.eventCount).toBe(2)
    expect(report.byPurpose[0]?.estimatedCostUsd).toBe('unknown')
  })
})
