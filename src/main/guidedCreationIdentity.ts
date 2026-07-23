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
import { getCharacterById, listPartyMembersForPlayer, updateCharacter } from '../db/repositories/characters'
import { getCampaignRaceByKey } from '../db/repositories/campaignRaces'
import { listRegionsByCampaign } from '../db/repositories/regions'
import { findRosterEntry } from '../engine/raceSelection/roster'
import { findBackgroundRosterEntry } from '../engine/characterBackground/roster'
import { resolveBackgroundDisplayLabel } from '../shared/characterBackground/resolveLabel'
import { CUSTOM_BACKGROUND_KEY, isCustomBackgroundKey } from '../shared/characterBackground/types'
import { CUSTOM_BACKGROUND_DESCRIPTION } from '../shared/characterBackground/apply'
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
import { companionIdentityDigestFromMember } from '../shared/partyMembers/types'
import { resolveCharacterStartingGear } from './guidedCreationStartingGear'

function abilityScoresFromCharacter(stats: Record<string, unknown>): Record<string, number> {
  const scores = stats.abilityScores as Record<string, number> | undefined
  return scores ?? { body: 10, agility: 10, mind: 10, presence: 10 }
}

function regionsForCampaign(db: Database.Database, campaignId: string) {
  return listRegionsByCampaign(db, campaignId).map((region) => ({
    id: region.id,
    name: region.name,
    description: region.description
  }))
}

function trimmedBackgroundStory(backgroundStory: string | null): string | null {
  return backgroundStory?.trim() || null
}

function customBackgroundContext(
  backgroundCustomLabel: string | null | undefined,
  backgroundStory: string | null
) {
  return {
    backgroundLabel: resolveBackgroundDisplayLabel(CUSTOM_BACKGROUND_KEY, backgroundCustomLabel),
    backgroundDescription: CUSTOM_BACKGROUND_DESCRIPTION,
    backgroundStory: trimmedBackgroundStory(backgroundStory)
  }
}

function rosterBackgroundContext(backgroundKey: string, backgroundStory: string | null) {
  const entry = findBackgroundRosterEntry(backgroundKey)
  return {
    backgroundLabel: entry?.label ?? null,
    backgroundDescription: entry?.description ?? null,
    backgroundStory: trimmedBackgroundStory(backgroundStory)
  }
}

export function resolveCharacterBackgroundContext(
  backgroundKey: string | null,
  backgroundStory: string | null,
  backgroundCustomLabel?: string | null
): {
  backgroundLabel: string | null
  backgroundDescription: string | null
  backgroundStory: string | null
} {
  if (!backgroundKey) {
    return {
      backgroundLabel: null,
      backgroundDescription: null,
      backgroundStory: trimmedBackgroundStory(backgroundStory)
    }
  }
  if (isCustomBackgroundKey(backgroundKey)) {
    return customBackgroundContext(backgroundCustomLabel, backgroundStory)
  }
  return rosterBackgroundContext(backgroundKey, backgroundStory)
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

function companionDigestsForPlayer(db: Database.Database, playerCharacterId: string) {
  return listPartyMembersForPlayer(db, playerCharacterId).map((member) =>
    companionIdentityDigestFromMember(member)
  )
}

function buildKickoffInterviewContext(
  db: Database.Database,
  campaignId: string,
  campaignPremise: string,
  character: NonNullable<ReturnType<typeof getCharacterById>>
) {
  const raceContext = resolveCharacterRaceContext(db, campaignId, character.raceKey)
  const backgroundContext = resolveCharacterBackgroundContext(
    character.backgroundKey,
    character.backgroundStory,
    character.backgroundCustomLabel
  )
  const gearContext = resolveCharacterStartingGear(
    db,
    character.id,
    character.stats as Record<string, unknown>
  )
  return {
    campaignPremise,
    characterName: character.name,
    characterClass: character.characterClass,
    abilityScores: abilityScoresFromCharacter(character.stats),
    alignment: character.alignment,
    raceName: raceContext.raceName,
    raceLore: raceContext.raceLore,
    backgroundLabel: backgroundContext.backgroundLabel,
    backgroundDescription: backgroundContext.backgroundDescription,
    backgroundStory: backgroundContext.backgroundStory,
    startingGear: gearContext.startingGear,
    knownSpellNames: gearContext.knownSpellNames,
    companions: companionDigestsForPlayer(db, character.id),
    regions: regionsForCampaign(db, campaignId)
  }
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

  const kickoffContext = buildKickoffInterviewContext(
    db,
    input.campaignId,
    campaign.premisePrompt,
    character
  )
  let dmReply: string
  try {
    const kickoff = await runIdentityInterviewKickoff(provider, kickoffContext)
    dmReply = kickoff.dmReply
  } catch {
    dmReply = identityWhoKickoffFallback(
      character.name,
      kickoffContext.backgroundLabel,
      kickoffContext.backgroundDescription
    )
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

interface IdentityInterviewTurn {
  input: GuidedCreationSendMessageInput
  characterId: string
  currentFoundations: ReturnType<typeof readIdentityFoundationsStatus>
  agentResult: IdentityInterviewResponse
}

function persistStartingRegionIfLocked(
  db: Database.Database,
  characterId: string,
  turn: IdentityInterviewTurn,
  merged: ReturnType<typeof mergeFoundationStatus>
): void {
  const whereNewlyLocked =
    !turn.currentFoundations.where.complete && Boolean(merged.where.complete && merged.where.summary)
  const regionId = turn.agentResult.startingRegionId
  if (!whereNewlyLocked || typeof regionId !== 'string' || !regionId) {
    return
  }
  const character = getCharacterById(db, characterId)
  if (!character) {
    return
  }
  updateCharacter(db, characterId, {
    stats: { ...(character.stats as Record<string, unknown>), currentRegionId: regionId }
  })
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
    persistStartingRegionIfLocked(db, characterId, turn, merged)
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
