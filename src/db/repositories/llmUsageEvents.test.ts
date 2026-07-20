import { describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { deleteCampaignCascade } from './deleteCampaign'
import {
  aggregateLlmUsageSeeds,
  insertLlmUsageEvent,
  listLlmUsageEvents,
  tryInsertLlmUsageEvent
} from './llmUsageEvents'

function sampleInput(overrides: Record<string, unknown> = {}) {
  return {
    providerName: 'openai',
    modelId: 'gpt-4o-mini',
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    purpose: 'play.narration' as const,
    campaignId: 'camp-1',
    outcome: 'success' as const,
    createdAt: '2026-01-01T12:00:00.000Z',
    ...overrides
  }
}

describe('llmUsageEvents repository: insert', () => {
  it('inserts an event and derives bucket from purpose', () => {
    const db = createTestDb()
    const event = insertLlmUsageEvent(db, sampleInput())

    expect(event.id).toBeTruthy()
    expect(event.bucket).toBe('play')
    expect(event.purpose).toBe('play.narration')
    expect(event.providerName).toBe('openai')
    expect(event.createdAt).toBe('2026-01-01T12:00:00.000Z')
  })

  it('accepts an explicit bucket override', () => {
    const db = createTestDb()
    const event = insertLlmUsageEvent(
      db,
      sampleInput({ purpose: 'play.narration', bucket: 'meta' })
    )
    expect(event.bucket).toBe('meta')
  })
})

describe('llmUsageEvents repository: list filters', () => {
  it('lists events filtered by time range', () => {
    const db = createTestDb()
    insertLlmUsageEvent(db, sampleInput({ createdAt: '2026-01-01T10:00:00.000Z' }))
    insertLlmUsageEvent(db, sampleInput({ createdAt: '2026-01-02T10:00:00.000Z' }))
    insertLlmUsageEvent(db, sampleInput({ createdAt: '2026-01-03T10:00:00.000Z' }))

    const rows = listLlmUsageEvents(db, {
      from: '2026-01-01T12:00:00.000Z',
      to: '2026-01-02T23:59:59.999Z'
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.createdAt).toBe('2026-01-02T10:00:00.000Z')
  })

  it('lists events filtered by campaign, purpose, and bucket', () => {
    const db = createTestDb()
    insertLlmUsageEvent(
      db,
      sampleInput({ campaignId: 'camp-a', purpose: 'play.narration', createdAt: '2026-01-01T00:00:00.000Z' })
    )
    insertLlmUsageEvent(
      db,
      sampleInput({ campaignId: 'camp-b', purpose: 'play.narration', createdAt: '2026-01-02T00:00:00.000Z' })
    )
    insertLlmUsageEvent(
      db,
      sampleInput({ campaignId: 'camp-a', purpose: 'system.ping', createdAt: '2026-01-03T00:00:00.000Z' })
    )

    expect(listLlmUsageEvents(db, { campaignId: 'camp-a' })).toHaveLength(2)
    expect(listLlmUsageEvents(db, { purpose: 'play.narration' })).toHaveLength(2)
    expect(listLlmUsageEvents(db, { bucket: 'meta' })).toHaveLength(1)
    expect(listLlmUsageEvents(db, { campaignId: 'camp-a', bucket: 'play' })).toHaveLength(1)
  })
})

describe('llmUsageEvents repository: aggregate', () => {
  it('aggregates counts and token sums by purpose', () => {
    const db = createTestDb()
    insertLlmUsageEvent(
      db,
      sampleInput({
        purpose: 'play.narration',
        inputTokens: 100,
        outputTokens: 40,
        totalTokens: 140
      })
    )
    insertLlmUsageEvent(
      db,
      sampleInput({
        purpose: 'play.narration',
        inputTokens: 50,
        outputTokens: 10,
        totalTokens: 60
      })
    )
    insertLlmUsageEvent(
      db,
      sampleInput({
        purpose: 'system.ping',
        inputTokens: 5,
        outputTokens: 1,
        totalTokens: 6
      })
    )

    const seeds = aggregateLlmUsageSeeds(db, {})
    const narration = seeds.find((row) => row.purpose === 'play.narration')
    const ping = seeds.find((row) => row.purpose === 'system.ping')

    expect(narration).toMatchObject({
      bucket: 'play',
      eventCount: 2,
      inputTokens: 150,
      outputTokens: 50,
      totalTokens: 200
    })
    expect(ping).toMatchObject({
      bucket: 'meta',
      eventCount: 1,
      inputTokens: 5,
      outputTokens: 1,
      totalTokens: 6
    })
  })
})

describe('llmUsageEvents repository: failure handling', () => {
  it('tryInsertLlmUsageEvent returns null and logs on insert failure', () => {
    const db = createTestDb()
    const first = insertLlmUsageEvent(db, sampleInput({ id: 'fixed-id' }))
    const log = vi.fn()
    const second = tryInsertLlmUsageEvent(db, sampleInput({ id: first.id }), log)

    expect(second).toBeNull()
    expect(log).toHaveBeenCalledOnce()
  })
})

describe('llmUsageEvents repository: campaign delete', () => {
  it('campaign delete removes campaign-scoped rows but keeps app-level rows', () => {
    const db = createTestDb()
    const target = createCampaign(db, {
      name: 'Target',
      premisePrompt: 'Test',
      deathMode: 'legendary'
    })
    const other = createCampaign(db, {
      name: 'Other',
      premisePrompt: 'Test',
      deathMode: 'legendary'
    })

    insertLlmUsageEvent(db, sampleInput({ campaignId: target.id }))
    insertLlmUsageEvent(db, sampleInput({ campaignId: other.id }))
    insertLlmUsageEvent(db, sampleInput({ campaignId: null, purpose: 'system.ping' }))

    deleteCampaignCascade(db, target.id)

    expect(listLlmUsageEvents(db, { campaignId: target.id })).toHaveLength(0)
    expect(listLlmUsageEvents(db, { campaignId: other.id })).toHaveLength(1)
    expect(listLlmUsageEvents(db, { purpose: 'system.ping' })).toHaveLength(1)
  })
})
