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
import { getCampaignRaceByKey } from '../db/repositories/campaignRaces'
import { findRosterEntry } from '../engine/raceSelection/roster'
import { findBackgroundRosterEntry } from '../engine/characterBackground/roster'
import type { RaceLore } from '../shared/raceSelection/types'
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

export function resolveCharacterBackgroundContext(
  backgroundKey: string | null,
  backgroundStory: string | null
): {
  backgroundLabel: string | null
  backgroundDescription: string | null
  backgroundStory: string | null
} {
  if (!backgroundKey) {
    return { backgroundLabel: null, backgroundDescription: null, backgroundStory: backgroundStory?.trim() || null }
  }
  const entry = findBackgroundRosterEntry(backgroundKey)
  return {
    backgroundLabel: entry?.label ?? null,
    backgroundDescription: entry?.description ?? null,
    backgroundStory: backgroundStory?.trim() || null
  }
}

export function resolveCharacterRaceContext(
  db: Database.Database,
  campaignId: string,
  raceKey: string | null
): { raceName: string | null; raceLore: RaceLore | null } {
  if (!raceKey) {
    return { raceName: null, raceLore: null }
  }
  const catalog = getCampaignRaceByKey(db, campaignId, raceKey)
  if (catalog) {
    return { raceName: catalog.label, raceLore: catalog.lore }
  }
  const roster = findRosterEntry(raceKey)
  return { raceName: roster?.label ?? null, raceLore: null }
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

  const raceContext = resolveCharacterRaceContext(db, input.campaignId, character.raceKey)
  const backgroundContext = resolveCharacterBackgroundContext(character.backgroundKey, character.backgroundStory)
  let dmReply: string
  try {
    const kickoff = await runIdentityInterviewKickoff(provider, {
      campaignPremise: campaign.premisePrompt,
      characterName: character.name,
      characterClass: character.characterClass,
      abilityScores: abilityScoresFromCharacter(character.stats),
      alignment: character.alignment,
      raceName: raceContext.raceName,
      raceLore: raceContext.raceLore,
      backgroundLabel: backgroundContext.backgroundLabel,
      backgroundDescription: backgroundContext.backgroundDescription,
      backgroundStory: backgroundContext.backgroundStory
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
  // The model's allFoundationsComplete flag is advisory only: the phase never
  // advances unless all four foundations are locked with non-empty summaries,
  // so the identity_* columns cannot end up null after phase completion.
  const foundationsComplete = allFoundationsComplete(merged)

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
