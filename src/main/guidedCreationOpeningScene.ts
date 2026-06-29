import type Database from 'better-sqlite3'
import type { OpeningSceneResponse } from '../agents/guidedOpeningScene'
import type { CharacterGuidedCreationFields } from '../shared/guidedCreation/types'
import type { GuidedCreationSendMessageInput, GuidedCreationSendMessageResult } from '../shared/guidedCreation/types'
import { appendEvent } from '../db/repositories/events'
import {
  completeOpeningScenePhase,
  readGuidedCreationFields,
  readIdentityFoundationsStatus,
  setOpeningScene
} from '../db/repositories/guidedCreation'
import { appendGuidedCreationMessage } from '../db/repositories/guidedCreationMessages'

export function persistOpeningSceneTurn(
  db: Database.Database,
  input: GuidedCreationSendMessageInput,
  characterId: string,
  agentResult: OpeningSceneResponse
): GuidedCreationSendMessageResult {
  db.transaction(() => {
    if (agentResult.proposedOpeningScene) {
      setOpeningScene(db, characterId, agentResult.proposedOpeningScene)
    }
    appendGuidedCreationMessage(db, {
      campaignId: input.campaignId,
      characterId: input.characterId,
      phase: 'opening_scene',
      role: 'dm',
      content: agentResult.dmReply
    })
    if (agentResult.sceneReady && agentResult.proposedOpeningScene) {
      completeOpeningScenePhase(db, characterId, agentResult.proposedOpeningScene)
      appendEvent(db, {
        campaignId: input.campaignId,
        type: 'opening_scene',
        payload: { narrationText: agentResult.proposedOpeningScene, characterId }
      })
    }
  })()

  const updated = readGuidedCreationFields(db, characterId)!
  return {
    ok: true,
    dmReply: agentResult.dmReply,
    guidedCreationPhase: updated.guidedCreationPhase,
    sceneReady: agentResult.sceneReady,
    proposedOpeningScene: agentResult.proposedOpeningScene,
    foundations: readIdentityFoundationsStatus(db, characterId)
  }
}

export function buildOpeningSceneIdentity(fields: CharacterGuidedCreationFields) {
  return {
    identityWho: fields.identityWho,
    identityWhy: fields.identityWhy,
    identityWhere: fields.identityWhere,
    identityWhat: fields.identityWhat
  }
}
