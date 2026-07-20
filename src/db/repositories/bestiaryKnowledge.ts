import type Database from 'better-sqlite3'
import type { LogEntry } from '../../shared/logBook/types'
import { assertNonEmptyBaseLore, getBestiarySpeciesById } from './bestiary'
import { getCampaignById } from './campaigns'
import { createLogEntry, listLogEntriesByCharacterAndCategory } from './logEntries'

export { assertNonEmptyBaseLore }

const INSTANCE_NPC_MARKER = 'instanceNpcId='

export interface AppendBestiaryDiscoveredFactInput {
  campaignId: string
  characterId: string
  speciesId: string
  title: string
  content: string
  /** Optional instance provenance. Stored in content only; relatedEntityId stays speciesId. */
  relatedNpcId?: string
}

export interface ListBestiaryDiscoveredFactsInput {
  characterId: string
  speciesId: string
}

export interface BestiarySpeciesGrounding {
  baseLore: string
  discoveredFacts: LogEntry[]
}

function contentWithOptionalInstance(content: string, relatedNpcId: string | undefined): string {
  if (!relatedNpcId) {
    return content
  }
  return `${content}\n\n[${INSTANCE_NPC_MARKER}${relatedNpcId}]`
}

/**
 * Append a player-facing discovered fact as a log-book `beast` entry.
 * `relatedEntityId` is always the species id (species-level knowledge).
 * When `relatedNpcId` is provided, it is recorded in content for instance provenance
 * (not a second entry, not a separate relatedEntityId).
 */
export function appendBestiaryDiscoveredFact(
  db: Database.Database,
  input: AppendBestiaryDiscoveredFactInput
): LogEntry {
  const species = getBestiarySpeciesById(db, input.speciesId)
  if (!species) {
    throw new Error(`Bestiary species not found: ${input.speciesId}`)
  }
  const campaign = getCampaignById(db, input.campaignId)
  if (!campaign) {
    throw new Error(`Campaign not found: ${input.campaignId}`)
  }

  return createLogEntry(db, {
    campaignId: input.campaignId,
    characterId: input.characterId,
    category: 'beast',
    title: input.title,
    content: contentWithOptionalInstance(input.content, input.relatedNpcId),
    relatedEntityId: input.speciesId,
    learnedInGameDate: campaign.inGameDate
  })
}

/**
 * List beast log entries for a character whose relatedEntityId is the given species.
 */
export function listBestiaryDiscoveredFacts(
  db: Database.Database,
  input: ListBestiaryDiscoveredFactsInput
): LogEntry[] {
  return listLogEntriesByCharacterAndCategory(db, input.characterId, 'beast').filter(
    (entry) => entry.relatedEntityId === input.speciesId
  )
}

/**
 * DM/context grounding: immutable base lore plus optional character-scoped discovered facts.
 * Never mutates base_lore.
 */
export function getBestiarySpeciesGrounding(
  db: Database.Database,
  speciesId: string,
  characterId?: string
): BestiarySpeciesGrounding {
  const species = getBestiarySpeciesById(db, speciesId)
  if (!species) {
    throw new Error(`Bestiary species not found: ${speciesId}`)
  }

  const discoveredFacts =
    characterId === undefined
      ? []
      : listBestiaryDiscoveredFacts(db, { characterId, speciesId })

  return {
    baseLore: species.baseLore,
    discoveredFacts
  }
}
