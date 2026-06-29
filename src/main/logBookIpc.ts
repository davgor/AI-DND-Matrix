import { ipcMain } from 'electron'
import { listLogEntriesByCharacter } from '../db/repositories/logEntries'
import { getDb } from './db'

export function registerLogBookHandlers(): void {
  ipcMain.handle('characters:listLogEntries', (_event, characterId: string) =>
    listLogEntriesByCharacter(getDb(), characterId)
  )
}
