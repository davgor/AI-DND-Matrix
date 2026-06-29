import type Database from 'better-sqlite3'
import {
  allFoundationsComplete,
  mergeFoundationStatus,
  summariesFromStatus,
  type IdentityInterviewResponse
} from '../agents/guidedIdentity'
import type { GuidedCreationSendMessageInput, GuidedCreationSendMessageResult } from '../shared/guidedCreation/types'
import {
  completeIdentityPhase,
  readGuidedCreationFields,
  readIdentityFoundationsStatus,
  updateIdentityFoundationSummaries
} from '../db/repositories/guidedCreation'
import { appendGuidedCreationMessage } from '../db/repositories/guidedCreationMessages'

export interface IdentityInterviewTurn {
  input: GuidedCreationSendMessageInput
  characterId: string
  currentFoundations: ReturnType<typeof readIdentityFoundationsStatus>
  agentResult: IdentityInterviewResponse
}

export function persistIdentityInterviewTurn(
  db: Database.Database,
  turn: IdentityInterviewTurn
): GuidedCreationSendMessageResult {
  const { input, characterId, currentFoundations, agentResult } = turn
  const merged = mergeFoundationStatus(currentFoundations, agentResult.foundations)
  const foundationsComplete = allFoundationsComplete(merged) || agentResult.allFoundationsComplete

  db.transaction(() => {
    updateIdentityFoundationSummaries(db, characterId, summariesFromStatus(merged))
    appendGuidedCreationMessage(db, {
      campaignId: input.campaignId,
      characterId: input.characterId,
      phase: 'identity',
      role: 'dm',
      content: agentResult.dmReply
    })
    if (foundationsComplete) {
      completeIdentityPhase(db, characterId)
    }
  })()

  const fields = readGuidedCreationFields(db, characterId)!
  return {
    ok: true,
    dmReply: agentResult.dmReply,
    guidedCreationPhase: fields.guidedCreationPhase,
    foundations: readIdentityFoundationsStatus(db, characterId),
    allFoundationsComplete: foundationsComplete
  }
}
