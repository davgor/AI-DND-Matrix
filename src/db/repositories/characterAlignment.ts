import type Database from 'better-sqlite3'
import type { Alignment, PendingAlignmentShift } from '../../shared/alignment/types'
import { parsePendingAlignmentShiftJson } from '../../shared/alignment/types'

export function setCharacterAlignment(
  db: Database.Database,
  characterId: string,
  alignment: Alignment
): void {
  db.prepare('UPDATE characters SET alignment = ? WHERE id = ?').run(alignment, characterId)
}

export function setPendingAlignmentShift(
  db: Database.Database,
  characterId: string,
  pending: PendingAlignmentShift
): void {
  db.prepare('UPDATE characters SET pending_alignment_shift = ? WHERE id = ?').run(
    JSON.stringify(pending),
    characterId
  )
}

export function clearPendingAlignmentShift(db: Database.Database, characterId: string): void {
  db.prepare('UPDATE characters SET pending_alignment_shift = NULL WHERE id = ?').run(characterId)
}

export function commitAlignmentShift(
  db: Database.Database,
  characterId: string,
  newAlignment: Alignment
): void {
  db.prepare(
    'UPDATE characters SET alignment = ?, pending_alignment_shift = NULL WHERE id = ?'
  ).run(newAlignment, characterId)
}

export function getPendingAlignmentShift(
  db: Database.Database,
  characterId: string
): PendingAlignmentShift | null {
  const row = db
    .prepare('SELECT pending_alignment_shift FROM characters WHERE id = ?')
    .get(characterId) as { pending_alignment_shift: string | null } | undefined
  return row ? parsePendingAlignmentShiftJson(row.pending_alignment_shift) : null
}
