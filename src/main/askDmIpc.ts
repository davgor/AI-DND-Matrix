import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { generateAskDmReply } from '../agents/askDm'
import { assembleAskDmContext } from '../agents/askDmContext'
import type { Provider } from '../agents/providers/types'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById } from '../db/repositories/characters'
import {
  appendAskDmMessage,
  listAskDmMessagesByCharacter
} from '../db/repositories/askDmMessages'
import type {
  AskDmListHistoryInput,
  AskDmMessage,
  AskDmSendMessageInput,
  AskDmSendMessageResult
} from '../shared/askDm/types'
import { buildAgentProvider } from './campaignIpc'
import { getDb } from './db'

// Isolation: askDm:* handlers MUST NOT call turn:resolve / resolvePlayerTurn /
// executeResolvedPlayerTurn or append IC events. OOC lives in ask_dm_messages only.

function validateSendInput(input: AskDmSendMessageInput): AskDmSendMessageResult | null {
  if (!input.message.trim()) {
    return { ok: false, reason: 'empty_message' }
  }
  return null
}

export function listAskDmHistory(
  db: Database.Database,
  input: AskDmListHistoryInput
): AskDmMessage[] {
  return listAskDmMessagesByCharacter(db, input.characterId)
}

export async function sendAskDmMessage(
  db: Database.Database,
  provider: Provider,
  input: AskDmSendMessageInput
): Promise<AskDmSendMessageResult> {
  const validationFailure = validateSendInput(input)
  if (validationFailure) {
    return validationFailure
  }

  const campaign = getCampaignById(db, input.campaignId)
  if (!campaign) {
    return { ok: false, reason: 'campaign_not_found' }
  }

  const character = getCharacterById(db, input.characterId)
  if (!character || character.campaignId !== input.campaignId) {
    return { ok: false, reason: 'character_not_found' }
  }

  const playerMessage = appendAskDmMessage(db, {
    campaignId: input.campaignId,
    characterId: input.characterId,
    role: 'player',
    content: input.message.trim()
  })

  const priorMessages = listAskDmMessagesByCharacter(db, input.characterId)
  const oocTranscript = priorMessages
    .filter((message) => message.id !== playerMessage.id)
    .map((message) => ({ role: message.role, content: message.content }))

  const context = assembleAskDmContext(db, {
    campaignId: input.campaignId,
    characterId: input.characterId,
    playerQuestion: playerMessage.content,
    oocTranscript
  })
  if (!context) {
    return { ok: false, reason: 'character_not_found', playerMessage }
  }

  const dmReply = await generateAskDmReply(provider, context)
  if (!dmReply) {
    return { ok: false, reason: 'agent_failed', playerMessage }
  }

  const dmMessage = appendAskDmMessage(db, {
    campaignId: input.campaignId,
    characterId: input.characterId,
    role: 'dm',
    content: dmReply
  })

  return { ok: true, playerMessage, dmMessage }
}

export function registerAskDmHandlers(): void {
  ipcMain.handle('askDm:listHistory', (_event, input: AskDmListHistoryInput) => {
    const db = getDb()
    return listAskDmHistory(db, input)
  })

  ipcMain.handle('askDm:sendMessage', async (_event, input: AskDmSendMessageInput) => {
    const db = getDb()
    return sendAskDmMessage(db, buildAgentProvider(), input)
  })
}
