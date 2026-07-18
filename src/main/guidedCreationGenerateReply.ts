import type Database from 'better-sqlite3'
import type { GuidedPlayerReplyInput } from '../agents/guidedPlayerReply'
import { getCharacterById } from '../db/repositories/characters'
import {
  readGuidedCreationFields,
  readIdentityFoundationsStatus
} from '../db/repositories/guidedCreation'
import { listGuidedCreationMessagesByPhase } from '../db/repositories/guidedCreationMessages'
import { listRegionsByCampaign } from '../db/repositories/regions'
import type { GuidedCreationGenerateReplyInput } from '../shared/guidedCreation/types'
import {
  abilityScoresFromCharacter,
  buildIdentityInterviewAgentContext
} from './guidedCreationAgentContext'
import { resolveCharacterBackgroundContext, resolveCharacterRaceContext } from './guidedCreationIdentity'
import { buildOpeningSceneAgentContext } from './guidedCreationOpeningScene'

type Character = NonNullable<ReturnType<typeof getCharacterById>>
type GuidedFields = NonNullable<ReturnType<typeof readGuidedCreationFields>>

function transcriptForPhase(
  db: Database.Database,
  characterId: string,
  phase: GuidedCreationGenerateReplyInput['phase']
): GuidedPlayerReplyInput['transcript'] {
  return listGuidedCreationMessagesByPhase(db, characterId, phase).map((row) => ({
    role: row.role,
    content: row.content
  }))
}

function buildIdentityPlayerReplyInput(input: {
  db: Database.Database
  request: GuidedCreationGenerateReplyInput
  character: Character
  fields: GuidedFields
  campaignPremise: string
  transcript: GuidedPlayerReplyInput['transcript']
  existingDraft: string | null
}): GuidedPlayerReplyInput {
  const identityContext = buildIdentityInterviewAgentContext({
    db: input.db,
    campaignId: input.request.campaignId,
    campaignPremise: input.campaignPremise,
    character: input.character,
    transcript: input.transcript,
    currentFoundations: readIdentityFoundationsStatus(input.db, input.character.id)
  })
  return {
    phase: 'identity',
    campaignPremise: input.campaignPremise,
    characterName: identityContext.characterName,
    characterClass: identityContext.characterClass,
    abilityScores: identityContext.abilityScores,
    alignment: identityContext.alignment,
    raceName: identityContext.raceName,
    raceLore: identityContext.raceLore,
    backgroundLabel: identityContext.backgroundLabel,
    backgroundDescription: identityContext.backgroundDescription,
    backgroundStory: identityContext.backgroundStory,
    foundations: identityContext.currentFoundations,
    identityWho: input.fields.identityWho,
    identityWhy: input.fields.identityWhy,
    identityWhere: input.fields.identityWhere,
    identityWhat: input.fields.identityWhat,
    regions: identityContext.regions,
    npcs: [],
    storyThread: null,
    currentOpeningScene: null,
    transcript: input.transcript,
    existingDraft: input.existingDraft
  }
}

function openingSceneRaceAndBackground(
  db: Database.Database,
  campaignId: string,
  character: Character
): Pick<
  GuidedPlayerReplyInput,
  | 'raceName'
  | 'raceLore'
  | 'backgroundLabel'
  | 'backgroundDescription'
  | 'backgroundStory'
> {
  const raceContext = resolveCharacterRaceContext(db, campaignId, character.raceKey)
  const backgroundContext = resolveCharacterBackgroundContext(
    character.backgroundKey,
    character.backgroundStory
  )
  return {
    raceName: raceContext.raceName,
    raceLore: raceContext.raceLore,
    backgroundLabel: backgroundContext.backgroundLabel,
    backgroundDescription: backgroundContext.backgroundDescription,
    backgroundStory: backgroundContext.backgroundStory
  }
}

function openingSceneSheetFacts(input: {
  db: Database.Database
  request: GuidedCreationGenerateReplyInput
  character: Character
  fields: GuidedFields
  campaignPremise: string
}): Pick<
  GuidedPlayerReplyInput,
  | 'phase'
  | 'campaignPremise'
  | 'characterName'
  | 'characterClass'
  | 'abilityScores'
  | 'alignment'
  | 'raceName'
  | 'raceLore'
  | 'backgroundLabel'
  | 'backgroundDescription'
  | 'backgroundStory'
  | 'foundations'
  | 'identityWho'
  | 'identityWhy'
  | 'identityWhere'
  | 'identityWhat'
  | 'regions'
> {
  const regions = listRegionsByCampaign(input.db, input.request.campaignId)
  return {
    phase: 'opening_scene',
    campaignPremise: input.campaignPremise,
    characterName: input.character.name,
    characterClass: input.character.characterClass,
    abilityScores: abilityScoresFromCharacter(input.character.stats),
    alignment: input.character.alignment,
    ...openingSceneRaceAndBackground(input.db, input.request.campaignId, input.character),
    foundations: null,
    identityWho: input.fields.identityWho,
    identityWhy: input.fields.identityWhy,
    identityWhere: input.fields.identityWhere,
    identityWhat: input.fields.identityWhat,
    regions: regions.map((region) => ({
      id: region.id,
      name: region.name,
      description: region.description
    }))
  }
}

function buildOpeningScenePlayerReplyInput(input: {
  db: Database.Database
  request: GuidedCreationGenerateReplyInput
  character: Character
  fields: GuidedFields
  campaignPremise: string
  transcript: GuidedPlayerReplyInput['transcript']
  existingDraft: string | null
}): GuidedPlayerReplyInput {
  const openingContext = buildOpeningSceneAgentContext(
    input.db,
    {
      campaignId: input.request.campaignId,
      characterId: input.request.characterId,
      phase: 'opening_scene',
      message: '.'
    },
    input.character,
    input.fields
  )
  return {
    ...openingSceneSheetFacts(input),
    npcs: openingContext.npcs,
    storyThread: openingContext.storyThread,
    currentOpeningScene: openingContext.currentOpeningScene,
    transcript: input.transcript,
    existingDraft: input.existingDraft
  }
}

export function buildPlayerReplyInput(input: {
  db: Database.Database
  request: GuidedCreationGenerateReplyInput
  character: Character
  fields: GuidedFields
  campaignPremise: string
}): GuidedPlayerReplyInput {
  const transcript = transcriptForPhase(input.db, input.character.id, input.request.phase)
  const existingDraft = input.request.existingDraft?.trim()
    ? input.request.existingDraft.trim()
    : null
  const shared = {
    db: input.db,
    request: input.request,
    character: input.character,
    fields: input.fields,
    campaignPremise: input.campaignPremise,
    transcript,
    existingDraft
  }
  if (input.request.phase === 'identity') {
    return buildIdentityPlayerReplyInput(shared)
  }
  return buildOpeningScenePlayerReplyInput(shared)
}
