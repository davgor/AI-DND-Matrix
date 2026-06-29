import { ipcMain } from 'electron'
import { listCharacterJournalEntries } from '../db/repositories/characterJournalEntries'
import { getDb } from './db'

export function registerJournalHandlers(): void {
  ipcMain.handle('characters:listJournalEntries', (_event, characterId: string) =>
    listCharacterJournalEntries(getDb(), characterId)
  )
}
