import type Database from 'better-sqlite3'
import type { GuidedCreationMessage } from '../shared/guidedCreation/types'
import { completeOpeningScenePhase, readGuidedCreationFields } from '../db/repositories/guidedCreation'
import { listGuidedCreationMessagesByPhase } from '../db/repositories/guidedCreationMessages'
import { appendEvent, listEventsByCampaign } from '../db/repositories/events'

export const GUIDED_OPENING_HANDOFF_EVENT = 'guided_opening_handoff'

export function deriveOpeningSceneText(
  openingScene: string | null,
  messages: GuidedCreationMessage[]
): string {
  const persisted = openingScene?.trim()
  if (persisted) {
    return persisted
  }
  const lastDm = [...messages].reverse().find((message) => message.role === 'dm')
  if (lastDm?.content.trim()) {
    return lastDm.content.trim()
  }
  return 'The adventure begins.'
}

export function hasOpeningScenePlayHandoff(
  db: Database.Database,
  campaignId: string,
  characterId: string
): boolean {
  return listEventsByCampaign(db, campaignId).some(
    (event) =>
      event.type === GUIDED_OPENING_HANDOFF_EVENT && event.payload['characterId'] === characterId
  )
}

export function importOpeningSceneTranscriptToNarrationLog(
  db: Database.Database,
  campaignId: string,
  characterId: string
): boolean {
  if (hasOpeningScenePlayHandoff(db, campaignId, characterId)) {
    return false
  }

  const messages = listGuidedCreationMessagesByPhase(db, characterId, 'opening_scene')
  db.transaction(() => {
    for (const message of messages) {
      if (message.role === 'player') {
        appendEvent(db, {
          campaignId,
          type: 'player_action',
          timestamp: message.createdAt,
          payload: { playerInput: message.content, characterId }
        })
      } else {
        appendEvent(db, {
          campaignId,
          type: 'player_action',
          timestamp: message.createdAt,
          payload: { narrationText: message.content, characterId }
        })
      }
    }
    appendEvent(db, {
      campaignId,
      type: GUIDED_OPENING_HANDOFF_EVENT,
      payload: { characterId, messageCount: messages.length }
    })
  })()

  return true
}

export function finalizeOpeningSceneForPlay(
  db: Database.Database,
  campaignId: string,
  characterId: string
): { ok: true } | { ok: false; reason: 'not_found' | 'invalid_phase' } {
  const fields = readGuidedCreationFields(db, characterId)
  if (!fields) {
    return { ok: false, reason: 'not_found' }
  }

  if (fields.guidedCreationPhase === 'complete') {
    importOpeningSceneTranscriptToNarrationLog(db, campaignId, characterId)
    return { ok: true }
  }

  if (fields.guidedCreationPhase !== 'opening_scene') {
    return { ok: false, reason: 'invalid_phase' }
  }

  const messages = listGuidedCreationMessagesByPhase(db, characterId, 'opening_scene')
  const openingScene = deriveOpeningSceneText(fields.openingScene, messages)

  db.transaction(() => {
    completeOpeningScenePhase(db, characterId, openingScene)
  })()
  importOpeningSceneTranscriptToNarrationLog(db, campaignId, characterId)

  return { ok: true }
}
