import { app, dialog, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import type Database from 'better-sqlite3'
import {
  aggregateUsageReport,
  buildUsageExportPayload,
  DEFAULT_PRICE_TABLE,
  formatUsageExportFilename,
  type LlmUsageExportResult,
  type LlmUsageRecentTotals
} from '../shared/llmUsage'
import { listLlmUsageEvents, type LlmUsageEventsFilter } from '../db/repositories/llmUsageEvents'
import { getRedactedSettings } from './settingsIpc'
import { DEFAULT_PROVIDER_SETTINGS } from '../shared/settings/types'
import { createElectronSecretCodec, getSettingsFilePath } from './settingsStore'
import { getDb } from './db'

const ALL_TIME_EVENT_THRESHOLD = 200
const RECENT_DAYS = 7

export interface RecentTotalsFilter {
  range: 'last_7_days' | 'all_time'
  from: string | null
  to: string | null
}

export interface LlmUsageExportDeps {
  showSaveDialog: typeof dialog.showSaveDialog
  writeFile: typeof writeFile
  now: () => Date
  appVersion: string
  platform: string
  providerMode: string
}

function countAllEvents(db: Database.Database): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM llm_usage_events').get() as { count: number }
  return row.count
}

export function resolveRecentTotalsFilter(
  db: Database.Database,
  now: Date = new Date()
): RecentTotalsFilter {
  if (countAllEvents(db) <= ALL_TIME_EVENT_THRESHOLD) {
    return { range: 'all_time', from: null, to: null }
  }

  const from = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString()
  return { range: 'last_7_days', from, to: now.toISOString() }
}

function toEventsFilter(filter: RecentTotalsFilter): LlmUsageEventsFilter {
  if (filter.from === null) {
    return {}
  }
  return { from: filter.from, to: filter.to ?? undefined }
}

export function getLlmUsageRecentTotals(
  db: Database.Database,
  now: Date = new Date()
): LlmUsageRecentTotals {
  const filter = resolveRecentTotalsFilter(db, now)
  const events = listLlmUsageEvents(db, toEventsFilter(filter))
  return {
    range: filter.range,
    from: filter.from,
    to: filter.to,
    summary: aggregateUsageReport(events, DEFAULT_PRICE_TABLE)
  }
}

export interface BuildUsageExportMeta {
  appVersion: string
  platform: string
  providerMode: string
  campaignIdFilter: string | null
  exportedAt: string
}

export function buildUsageExportPayloadForDb(
  db: Database.Database,
  meta: BuildUsageExportMeta,
  filter: LlmUsageEventsFilter = {}
) {
  const events = listLlmUsageEvents(db, filter)
  const summary = aggregateUsageReport(events, DEFAULT_PRICE_TABLE)
  return buildUsageExportPayload({ events, summary, meta })
}

export async function exportLlmUsageLog(
  db: Database.Database,
  deps: LlmUsageExportDeps,
  campaignIdFilter: string | null = null
): Promise<LlmUsageExportResult> {
  const exportedAt = deps.now().toISOString()
  const filter = campaignIdFilter ? { campaignId: campaignIdFilter } : {}
  const payload = buildUsageExportPayloadForDb(db, {
    appVersion: deps.appVersion,
    platform: deps.platform,
    providerMode: deps.providerMode,
    campaignIdFilter,
    exportedAt
  }, filter)

  const dialogResult = await deps.showSaveDialog({
    title: 'Export usage log',
    defaultPath: formatUsageExportFilename(deps.now()),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })

  if (dialogResult.canceled || !dialogResult.filePath) {
    return { ok: false, canceled: true }
  }

  try {
    await deps.writeFile(dialogResult.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
    return { ok: true, path: dialogResult.filePath }
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }
}

function readProviderMode(): string {
  const settings = getRedactedSettings(
    getSettingsFilePath(),
    createElectronSecretCodec(),
    DEFAULT_PROVIDER_SETTINGS
  )
  return settings.mode
}

export function registerLlmUsageHandlers(): void {
  ipcMain.handle('llmUsage:getRecentTotals', () => getLlmUsageRecentTotals(getDb()))

  ipcMain.handle('llmUsage:export', async (_event, campaignId?: string | null) =>
    exportLlmUsageLog(getDb(), {
      showSaveDialog: (options) => dialog.showSaveDialog(options),
      writeFile,
      now: () => new Date(),
      appVersion: app.getVersion(),
      platform: process.platform,
      providerMode: readProviderMode()
    }, campaignId ?? null)
  )
}
