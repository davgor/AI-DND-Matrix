import { ipcMain } from 'electron'
import { getCharacterQuest, upsertCharacterQuest } from '../db/repositories/quests'
import { deleteQuest } from '../db/repositories/quests'
import { buildAgentProvider } from './campaignIpc'
import { getDb } from './db'
import {
  buildQuestViews,
  createQuestForCharacter,
  forceQuestStatus,
  promoteWorldFactForCharacter,
  questError,
  transitionCharacterQuest,
  updateQuestForCharacter
} from './questIpcHandlers'

export function registerQuestHandlers(): void {
  ipcMain.handle('quests:listForCharacter', (_event, characterId: string) =>
    buildQuestViews(getDb(), characterId)
  )

  ipcMain.handle('quests:accept', (_event, input: { characterId: string; questId: string }) =>
    transitionCharacterQuest(getDb(), input.characterId, input.questId, 'active')
  )

  ipcMain.handle('quests:abandon', (_event, input: { characterId: string; questId: string }) =>
    transitionCharacterQuest(getDb(), input.characterId, input.questId, 'abandoned')
  )

  ipcMain.handle(
    'quests:updateNotes',
    (_event, input: { characterId: string; questId: string; notes: string }) => {
      const db = getDb()
      const existing = getCharacterQuest(db, input.characterId, input.questId)
      if (!existing) {
        return questError('not_found', 'Quest not found for this character.')
      }
      upsertCharacterQuest(db, {
        characterId: input.characterId,
        questId: input.questId,
        status: existing.status,
        playerNotes: input.notes
      })
      return buildQuestViews(db, input.characterId).find((row) => row.quest.id === input.questId) ?? questError('not_found', 'Quest not found for this character.')
    }
  )

  ipcMain.handle('quests:create', (_event, input) => createQuestForCharacter(getDb(), input))

  ipcMain.handle('quests:update', (_event, input) => updateQuestForCharacter(getDb(), input))

  ipcMain.handle('quests:delete', (_event, input: { questId: string; characterId: string }) => {
    if (!deleteQuest(getDb(), input.questId)) {
      return questError('not_found', 'Quest not found.')
    }
    return { ok: true as const }
  })

  ipcMain.handle('quests:forceStatus', async (_event, input) =>
    forceQuestStatus(getDb(), await buildAgentProvider(), input)
  )

  ipcMain.handle('quests:promoteWorldFact', (_event, input) =>
    promoteWorldFactForCharacter(getDb(), input)
  )
}

export { buildQuestViews } from './questIpcHandlers'
