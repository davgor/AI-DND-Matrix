import type Database from 'better-sqlite3'
import {
  allFoundationsComplete,
  identityWhoKickoffFallback,
  mergeFoundationStatus,
  runIdentityInterviewKickoff,
  summariesFromStatus,
  type IdentityInterviewResponse
} from '../agents/guidedIdentity'
import type { Provider } from '../agents/providers/types'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById } from '../db/repositories/characters'
import type { GuidedCreationSendMessageInput, GuidedCreationSendMessageResult } from '../shared/guidedCreation/types'
import {
  completeIdentityPhase,
  readGuidedCreationFields,
  readIdentityFoundationsStatus,
  updateIdentityFoundationSummaries
} from '../db/repositories/guidedCreation'
import {
  appendGuidedCreationMessage,
  listGuidedCreationMessagesByPhase
} from '../db/repositories/guidedCreationMessages'
import type { GuidedCreationKickoffInput, GuidedCreationKickoffResult } from '../shared/guidedCreation/types'

function abilityScoresFromCharacter(stats: Record<string, unknown>): Record<string, number> {
  const scores = stats.abilityScores as Record<string, number> | undefined
  return scores ?? { body: 10, agility: 10, mind: 10, presence: 10 }
}

export async function kickoffIdentityInterviewIfNeeded(
  db: Database.Database,
  provider: Provider,
  input: GuidedCreationKickoffInput
): Promise<GuidedCreationKickoffResult> {
  const character = getCharacterById(db, input.characterId)
  const campaign = getCampaignById(db, input.campaignId)
  if (!character || !campaign || character.campaignId !== input.campaignId) {
    return { ok: false, reason: 'not_found' }
  }

  const fields = readGuidedCreationFields(db, character.id)
  if (!fields || fields.guidedCreationPhase !== 'identity') {
    return { ok: false, reason: 'invalid_phase' }
  }

  if (listGuidedCreationMessagesByPhase(db, character.id, 'identity').length > 0) {
    return { ok: true, kickedOff: false }
  }

  let dmReply: string
  try {
    const kickoff = await runIdentityInterviewKickoff(provider, {
      campaignPremise: campaign.premisePrompt,
      characterName: character.name,
      characterClass: character.characterClass,
      abilityScores: abilityScoresFromCharacter(character.stats),
      alignment: character.alignment
    })
    dmReply = kickoff.dmReply
  } catch {
    dmReply = identityWhoKickoffFallback(character.name)
  }

  appendGuidedCreationMessage(db, {
    campaignId: input.campaignId,
    characterId: input.characterId,
    phase: 'identity',
    role: 'dm',
    content: dmReply
  })

  return { ok: true, kickedOff: true }
}

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
