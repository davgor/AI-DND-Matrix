import { ipcMain } from 'electron'
import { getDb } from './db'
import { listKnownSpellsForCharacter } from './spellbookIpcHandlers'

export function registerSpellbookHandlers(): void {
  ipcMain.handle('spellbook:listForCharacter', (_event, characterId: string) =>
    listKnownSpellsForCharacter(getDb(), characterId)
  )
}
