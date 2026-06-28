import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export interface RegionHistoryEntry {
  id: string
  regionId: string
  inGameDate: number
  content: string
  isCompressed: boolean
}

export interface CreateRegionHistoryEntryInput {
  regionId: string
  inGameDate: number
  content: string
}

interface RegionHistoryRow {
  id: string
  region_id: string
  in_game_date: number
  content: string
  is_compressed: number
}

function rowToEntry(row: RegionHistoryRow): RegionHistoryEntry {
  return {
    id: row.id,
    regionId: row.region_id,
    inGameDate: row.in_game_date,
    content: row.content,
    isCompressed: row.is_compressed === 1
  }
}

export function createRegionHistoryEntry(
  db: Database.Database,
  input: CreateRegionHistoryEntryInput
): RegionHistoryEntry {
  const id = randomUUID()

  db.prepare(
    `INSERT INTO region_history (id, region_id, in_game_date, content, is_compressed)
     VALUES (@id, @regionId, @inGameDate, @content, 0)`
  ).run({
    id,
    regionId: input.regionId,
    inGameDate: input.inGameDate,
    content: input.content
  })

  return {
    id,
    regionId: input.regionId,
    inGameDate: input.inGameDate,
    content: input.content,
    isCompressed: false
  }
}

export function listRegionHistoryByRegion(
  db: Database.Database,
  regionId: string
): RegionHistoryEntry[] {
  const rows = db
    .prepare('SELECT * FROM region_history WHERE region_id = ? ORDER BY in_game_date')
    .all(regionId) as RegionHistoryRow[]
  return rows.map(rowToEntry)
}

export function markRegionHistoryCompressed(
  db: Database.Database,
  id: string,
  newContent: string
): void {
  db.prepare('UPDATE region_history SET content = ?, is_compressed = 1 WHERE id = ?').run(
    newContent,
    id
  )
}

export function listCompressionCandidates(
  db: Database.Database,
  regionId: string,
  inGameDateThreshold: number
): RegionHistoryEntry[] {
  const rows = db
    .prepare(
      `SELECT * FROM region_history
       WHERE region_id = ? AND in_game_date < ? AND is_compressed = 0
       ORDER BY in_game_date`
    )
    .all(regionId, inGameDateThreshold) as RegionHistoryRow[]
  return rows.map(rowToEntry)
}

export interface ReplaceWithCompressedSummaryInput {
  regionId: string
  candidateIds: string[]
  summary: string
  inGameDate: number
}

export function replaceRegionHistoryWithCompressedSummary(
  db: Database.Database,
  input: ReplaceWithCompressedSummaryInput
): RegionHistoryEntry {
  const { regionId, candidateIds, summary, inGameDate } = input
  const id = randomUUID()
  const deleteStmt = db.prepare('DELETE FROM region_history WHERE id = ?')
  const insertStmt = db.prepare(
    `INSERT INTO region_history (id, region_id, in_game_date, content, is_compressed)
     VALUES (?, ?, ?, ?, 1)`
  )
  db.transaction(() => {
    for (const candidateId of candidateIds) {
      deleteStmt.run(candidateId)
    }
    insertStmt.run(id, regionId, inGameDate, summary)
  })()
  return { id, regionId, inGameDate, content: summary, isCompressed: true }
}
