import type { Campaign } from '../../db/repositories/campaigns'
import type { Character } from '../../db/repositories/characters'
import type { Npc } from '../../db/repositories/npcs'
import type { Region } from '../../db/repositories/regions'
import type { StoryThread } from '../../db/repositories/storyThreads'
import type { Deity } from '../../db/repositories/deities'
import type { RegionExtras } from '../campaign/regionExtras'
import type { Faction, FactionRelation } from '../factions'

/** Durable life status on player character rows (engine/main authority). */
export type CharacterLifeStatus = 'alive' | 'dead'

/**
 * Short labels persisted on `characters.death_cause`.
 * Engine sets these when death is finalized; agents may read but never invent them.
 */
export type DeathCause =
  | 'legendary_dying'
  | 'respawn_exhausted'
  | 'execute_defeat'
  | 'story_sacrifice'

export interface CharacterObituaryNpcReaction {
  npcId: string
  npcName: string
  tone: 'positive' | 'negative' | 'neutral'
  reaction: string
}

/** AI-generated at death; persisted in `obituary_json`, not player-editable. */
export interface CharacterObituary {
  generatedAt: string
  deathCause: string
  narrativeBody: string
  npcReactions: CharacterObituaryNpcReaction[]
}

export interface HubCastMember {
  id: string
  name: string
  characterClass: string
  level: number
  portraitPath: string | null
  lifeStatus: CharacterLifeStatus
  lastKnownRegionName: string | null
  hasObituary: boolean
  obituary?: CharacterObituary
}

export interface HubCharacterQuestSummary {
  characterId: string
  mainQuestHookLine: string | null
  mainQuestTitle: string | null
  activeSideQuestCount: number
}

export interface HubRegionQuestAvailability {
  regionId: string
  availableQuestCount: number
}

/** Extends campaign detail with play-aware fields for the hub preview panel. */
export interface PlayAwareHubSnapshot {
  campaign: Campaign | undefined
  regions: Region[]
  npcs: Npc[]
  regionExtras: RegionExtras[]
  storyThreads: StoryThread[]
  characters: Character[]
  deities: Deity[]
  factions: Faction[]
  factionRelations: FactionRelation[]
  currentStateSummary: string
  cast: HubCastMember[]
  questSummariesByCharacterId: HubCharacterQuestSummary[]
  regionQuestAvailability: HubRegionQuestAvailability[]
}

/** Campaign opens Campaign Hub when at least one player has completed guided creation. */
export function isHubEligible(characters: Character[]): boolean {
  return characters.some(
    (character) => character.kind === 'player' && character.guidedCreationPhase === 'complete'
  )
}

/**
 * Each `ai_party_member` row has `ownerPlayerCharacterId`.
 * `null` = shared/unowned (created at first character setup).
 * Recruitment reassigns owner to the recruiting player character.
 */
export interface PartyRosterMember {
  characterId: string
  ownerPlayerCharacterId: string | null
}

/**
 * When active character A encounters inactive living player B,
 * B is narrated via agent grounded in B's SQLite history — not chat history.
 */
export interface InactivePlayerProxyContext {
  inactiveCharacterId: string
  activeCharacterId: string
  campaignId: string
  regionId: string
}

/**
 * DM narration may emit log-book proposals for both active and inactive player characters.
 */
export interface CrossCharacterLogWrite {
  characterId: string
  category: 'event' | 'place' | 'person' | 'beast' | 'thing'
  title: string
  content: string
  relatedEntityId?: string
}

/**
 * Travel target with no matching region row triggers history-aware generation first.
 */
export interface UngeneratedTravelIntent {
  destinationDescription: string
  campaignId: string
  characterId: string
}

/** DM narration schema flag for story-driven death under any death mode. */
export interface StoryDrivenDeathFlag {
  deathCause: DeathCause
  narrativeHint?: string
}
