import { ipcMain } from 'electron'
import type { CreateLogEntryInput, LogCategory, UpdateLogEntryInput } from '../shared/logBook/types'
import {
  createLogEntry,
  deleteLogEntryForCharacter,
  listLogEntriesByCharacter,
  updateLogEntryForCharacter
} from '../db/repositories/logEntries'
import { getCampaignById } from '../db/repositories/campaigns'
import { getDb } from './db'

export interface CreateLogEntryIpcInput {
  campaignId: string
  characterId: string
  category: LogCategory
  title: string
  content: string
  relatedEntityId?: string | null
}

export interface UpdateLogEntryIpcInput {
  characterId: string
  entryId: string
  updates: UpdateLogEntryInput
}

export interface DeleteLogEntryIpcInput {
  characterId: string
  entryId: string
}

export function registerLogBookHandlers(): void {
  ipcMain.handle('characters:listLogEntries', (_event, characterId: string) =>
    listLogEntriesByCharacter(getDb(), characterId)
  )

  ipcMain.handle('logBook:createEntry', (_event, input: CreateLogEntryIpcInput) => {
    const db = getDb()
    const campaign = getCampaignById(db, input.campaignId)
    if (!campaign) {
      return null
    }
    const payload: CreateLogEntryInput = {
      campaignId: input.campaignId,
      characterId: input.characterId,
      category: input.category,
      title: input.title,
      content: input.content,
      relatedEntityId: input.relatedEntityId ?? null,
      learnedInGameDate: campaign.inGameDate
    }
    return createLogEntry(db, payload)
  })

  ipcMain.handle('logBook:updateEntry', (_event, input: UpdateLogEntryIpcInput) =>
    updateLogEntryForCharacter(getDb(), input.characterId, input.entryId, input.updates)
  )

  ipcMain.handle('logBook:deleteEntry', (_event, input: DeleteLogEntryIpcInput) =>
    deleteLogEntryForCharacter(getDb(), input.characterId, input.entryId)
  )
}
