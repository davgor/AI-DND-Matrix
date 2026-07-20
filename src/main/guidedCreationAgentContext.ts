import type Database from 'better-sqlite3'
import type { IdentityInterviewContext } from '../agents/guidedIdentity'
import type { Character } from '../db/repositories/characters'
import { listRegionsByCampaign } from '../db/repositories/regions'
import type { IdentityFoundationsStatus } from '../shared/guidedCreation/types'
import { resolveCharacterBackgroundContext, resolveCharacterRaceContext } from './guidedCreationIdentity'
import { resolveCharacterStartingGear } from './guidedCreationStartingGear'

export function abilityScoresFromCharacter(stats: Record<string, unknown>): Record<string, number> {
  const scores = stats.abilityScores as Record<string, number> | undefined
  return scores ?? { body: 10, agility: 10, mind: 10, presence: 10 }
}

export interface BuildIdentityInterviewAgentContextInput {
  db: Database.Database
  campaignId: string
  campaignPremise: string
  character: Character
  transcript: IdentityInterviewContext['transcript']
  currentFoundations: IdentityFoundationsStatus
}

export function buildIdentityInterviewAgentContext(
  input: BuildIdentityInterviewAgentContextInput
): IdentityInterviewContext {
  const raceContext = resolveCharacterRaceContext(input.db, input.campaignId, input.character.raceKey)
  const backgroundContext = resolveCharacterBackgroundContext(
    input.character.backgroundKey,
    input.character.backgroundStory
  )
  const gearContext = resolveCharacterStartingGear(
    input.db,
    input.character.id,
    input.character.stats as Record<string, unknown>
  )
  const regions = listRegionsByCampaign(input.db, input.campaignId).map((region) => ({
    id: region.id,
    name: region.name,
    description: region.description
  }))
  return {
    campaignPremise: input.campaignPremise,
    characterName: input.character.name,
    characterClass: input.character.characterClass,
    abilityScores: abilityScoresFromCharacter(input.character.stats),
    alignment: input.character.alignment,
    raceName: raceContext.raceName,
    raceLore: raceContext.raceLore,
    backgroundLabel: backgroundContext.backgroundLabel,
    backgroundDescription: backgroundContext.backgroundDescription,
    backgroundStory: backgroundContext.backgroundStory,
    startingGear: gearContext.startingGear,
    knownSpellNames: gearContext.knownSpellNames,
    regions,
    transcript: input.transcript,
    currentFoundations: input.currentFoundations
  }
}
