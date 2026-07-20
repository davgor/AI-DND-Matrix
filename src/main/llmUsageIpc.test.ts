import { describe, expect, it, vi } from 'vitest'
import type { SaveDialogReturnValue } from 'electron'
import { createTestDb } from '../db/testUtils'
import { insertLlmUsageEvent } from '../db/repositories/llmUsageEvents'
import {
  buildUsageExportPayloadForDb,
  exportLlmUsageLog,
  getLlmUsageRecentTotals,
  resolveRecentTotalsFilter,
  type LlmUsageExportDeps
} from './llmUsageIpc'

function seedEvent(
  db: ReturnType<typeof createTestDb>,
  overrides: Record<string, unknown> = {}
) {
  return insertLlmUsageEvent(db, {
    providerName: 'claude',
    modelId: 'claude-sonnet-4-6',
    inputTokens: 1_000,
    outputTokens: 500,
    totalTokens: 1_500,
    purpose: 'play.narration',
    campaignId: 'camp-1',
    outcome: 'success',
    createdAt: '2026-07-15T12:00:00.000Z',
    ...overrides
  })
}

describe('resolveRecentTotalsFilter', () => {
  it('uses all-time when the table is small', () => {
    const db = createTestDb()
    seedEvent(db)

    const filter = resolveRecentTotalsFilter(db, new Date('2026-07-20T12:00:00.000Z'))
    expect(filter.range).toBe('all_time')
    expect(filter.from).toBeNull()
  })

  it('uses last 7 days when there are many events', () => {
    const db = createTestDb()
    for (let index = 0; index < 201; index += 1) {
      seedEvent(db, { createdAt: `2026-01-${String((index % 28) + 1).padStart(2, '0')}T12:00:00.000Z` })
    }

    const now = new Date('2026-07-20T12:00:00.000Z')
    const filter = resolveRecentTotalsFilter(db, now)
    expect(filter.range).toBe('last_7_days')
    expect(filter.from).toBe('2026-07-13T12:00:00.000Z')
  })
})

describe('getLlmUsageRecentTotals', () => {
  it('returns setup vs play bucket rollups', () => {
    const db = createTestDb()
    seedEvent(db, { purpose: 'play.narration', bucket: 'play' })
    seedEvent(db, {
      purpose: 'campaign.world',
      bucket: 'setup',
      createdAt: '2026-07-16T12:00:00.000Z'
    })

    const totals = getLlmUsageRecentTotals(db, new Date('2026-07-20T12:00:00.000Z'))
    expect(totals.summary.byBucket.map((row) => row.bucket)).toEqual(['setup', 'play'])
    expect(totals.summary.byBucket.find((row) => row.bucket === 'setup')?.eventCount).toBe(1)
    expect(totals.summary.byBucket.find((row) => row.bucket === 'play')?.eventCount).toBe(1)
  })
})

describe('exportLlmUsageLog', () => {
  it('writes JSON export via save dialog and returns the path', async () => {
    const db = createTestDb()
    seedEvent(db)
    const writeFile = vi.fn(async (_path: string, data: string) => {
      expect(data).toContain('"schemaVersion": 1')
    }) as LlmUsageExportDeps['writeFile']
    const showSaveDialog = vi.fn(async (): Promise<SaveDialogReturnValue> => ({
      canceled: false,
      filePath: 'C:\\exports\\ai-ttrpg-usage.json'
    }))

    const result = await exportLlmUsageLog(db, {
      showSaveDialog,
      writeFile,
      now: () => new Date('2026-07-20T12:00:00.000Z'),
      appVersion: '0.28.0',
      platform: 'win32',
      providerMode: 'claude'
    })

    expect(result).toEqual({ ok: true, path: 'C:\\exports\\ai-ttrpg-usage.json' })
    expect(showSaveDialog).toHaveBeenCalledOnce()
    expect(writeFile).toHaveBeenCalledOnce()
    expect(writeFile).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining('claudeApiKey'))
  })

  it('returns canceled when the dialog is dismissed', async () => {
    const db = createTestDb()
    const result = await exportLlmUsageLog(db, {
      showSaveDialog: vi.fn(async (): Promise<SaveDialogReturnValue> => ({ canceled: true, filePath: '' })),
      writeFile: vi.fn(),
      now: () => new Date('2026-07-20T12:00:00.000Z'),
      appVersion: '0.28.0',
      platform: 'win32',
      providerMode: 'claude'
    })

    expect(result).toEqual({ ok: false, canceled: true })
  })
})

describe('buildUsageExportPayloadForDb', () => {
  it('never includes provider secrets in payload', () => {
    const db = createTestDb()
    seedEvent(db)
    const payload = buildUsageExportPayloadForDb(db, {
      appVersion: '0.28.0',
      platform: 'win32',
      providerMode: 'claude',
      campaignIdFilter: null,
      exportedAt: '2026-07-20T12:00:00.000Z'
    })

    const json = JSON.stringify(payload)
    expect(json).not.toContain('apiKey')
    expect(json).not.toContain('prompt')
    expect(payload.events).toHaveLength(1)
  })
})
