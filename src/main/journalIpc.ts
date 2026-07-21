import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { listCharacterJournalEntries } from '../db/repositories/characterJournalEntries'
import { listLogEntriesByCharacterAndCategory } from '../db/repositories/logEntries'
import {
  getNpcById,
  listNpcsWithGeneratedOpinion,
  type Npc
} from '../db/repositories/npcs'
import { toJournalKnownDossiers } from '../shared/journal/knownDossiers'
import { mergePersonMatchCandidates } from '../shared/journal/personCandidates'
import type { JournalKnownDossier, PersonMatchCandidate } from '../shared/journal/types'
import { getDb } from './db'

export function listKnownDossiers(
  db: Database.Database,
  campaignId: string
): JournalKnownDossier[] {
  return toJournalKnownDossiers(listNpcsWithGeneratedOpinion(db, campaignId))
}

function toPersonCandidate(npc: Npc): PersonMatchCandidate | null {
  if (npc.isPartyMember) {
    return null
  }
  return { npcId: npc.id, name: npc.name }
}

export function listPersonMatchCandidates(
  db: Database.Database,
  input: { campaignId: string; characterId: string }
): PersonMatchCandidate[] {
  const fromOpinion = listNpcsWithGeneratedOpinion(db, input.campaignId)
    .map(toPersonCandidate)
    .filter((c): c is PersonMatchCandidate => c !== null)

  const fromLogBook: PersonMatchCandidate[] = []
  for (const entry of listLogEntriesByCharacterAndCategory(db, input.characterId, 'person')) {
    if (entry.relatedEntityId == null) {
      continue
    }
    const npc = getNpcById(db, entry.relatedEntityId)
    if (npc === undefined || npc.campaignId !== input.campaignId) {
      continue
    }
    const candidate = toPersonCandidate(npc)
    if (candidate !== null) {
      fromLogBook.push(candidate)
    }
  }

  return mergePersonMatchCandidates(fromOpinion, fromLogBook)
}

export function registerJournalHandlers(): void {
  ipcMain.handle('characters:listJournalEntries', (_event, characterId: string) =>
    listCharacterJournalEntries(getDb(), characterId)
  )
  ipcMain.handle('journal:listKnownDossiers', (_event, campaignId: string) =>
    listKnownDossiers(getDb(), campaignId)
  )
  ipcMain.handle(
    'journal:listPersonMatchCandidates',
    (_event, input: { campaignId: string; characterId: string }) =>
      listPersonMatchCandidates(getDb(), input)
  )
}
