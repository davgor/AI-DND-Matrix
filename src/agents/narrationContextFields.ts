import type Database from 'better-sqlite3'
import type { Alignment, PendingAlignmentShift } from '../shared/alignment/types'
import { getCharacterById, listPlayerCharacters } from '../db/repositories/characters'
import { listEventsByCampaign } from '../db/repositories/events'
import { isHostileNpc, listNpcsByRegion } from '../db/repositories/npcs'
import { getRegionById, type RegionStatus } from '../db/repositories/regions'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { listLogEntriesByCharacter } from '../db/repositories/logEntries'
import { getEquippedWeaponDamageProfile, summarizeWeaponProfile } from '../db/repositories/weaponDamageProfile'
import { getActiveEncounter } from '../db/repositories/combatEncounters'
import { buildCombatSummaryForNarration } from './dmCombatContext'
import { takeRecent } from './contextWindow'
import { slimEvents, slimLogEntries, type SlimEvent, type SlimLogEntry } from './contextSlim'
import { windowLogEntriesForNarration } from './logBookWindow'
import {
  buildDmFactionPlayPromptSection,
  loadDmFactionPlayContext
} from './factionPlayContext'
import { buildWorldMutationDigest } from '../shared/worldMutations'
import { loadActiveQuestsForCharacter } from './narrationQuestContext'
import { loadKnownSpellsForNarration } from './narrationSpellContext'
import type { ActiveQuestContext } from './questWindow'
import type { KnownSpellContext } from './spellWindow'
import {
  loadPresentBestiaryGrounding,
  type SlimPresentBestiaryGrounding
} from './bestiary/contextGrounding'

type PresentNpcContext = {
  id: string
  name: string
  isHostile: boolean
  alive: boolean
}

function listInactiveLivingPlayersInRegion(
  db: Database.Database,
  campaignId: string,
  regionId: string,
  characterId: string
) {
  return listPlayerCharacters(db, campaignId)
    .filter((player) => {
      if (player.id === characterId || player.lifeStatus !== 'alive') {
        return false
      }
      const stats = player.stats as { currentRegionId?: string }
      return stats.currentRegionId === regionId
    })
    .map((player) => ({
      id: player.id,
      name: player.name,
      characterClass: player.characterClass
    }))
}

function loadNarrationWorldFields(
  db: Database.Database,
  campaignId: string,
  regionId: string,
  characterId: string
): {
  regionStatus: RegionStatus
  recentEvents: SlimEvent[]
  storyThreadState: { id: string; state: string; summary: string } | null
  presentNpcs: PresentNpcContext[]
  bestiaryRecall: SlimPresentBestiaryGrounding[]
  worldMutationDigest?: string
} {
  const region = getRegionById(db, regionId)
  const recentEvents = slimEvents(takeRecent(listEventsByCampaign(db, campaignId)))
  const [primaryThread] = listStoryThreadsByCampaign(db, campaignId)
  const regionNpcs = listNpcsByRegion(db, regionId).filter((npc) => !npc.isPartyMember)
  const presentNpcs = regionNpcs.map((npc) => ({
    id: npc.id,
    name: npc.name,
    isHostile: isHostileNpc(npc),
    alive: npc.status.alive
  }))
  const bestiaryRecall = loadPresentBestiaryGrounding(db, {
    characterId,
    presentNpcs: regionNpcs.map((npc) => ({
      id: npc.id,
      bestiarySpeciesId: npc.bestiarySpeciesId
    }))
  })
  const regionStatus = region?.status ?? { destroyed: false }
  const worldMutationDigest = buildWorldMutationDigest({
    regionName: region?.name ?? 'Unknown region',
    regionStatus,
    presentNpcs
  })
  return {
    regionStatus,
    recentEvents,
    storyThreadState: primaryThread
      ? { id: primaryThread.id, state: primaryThread.state, summary: primaryThread.summary }
      : null,
    presentNpcs,
    bestiaryRecall,
    ...(worldMutationDigest ? { worldMutationDigest } : {})
  }
}

function loadNarrationCharacterFields(
  db: Database.Database,
  input: { campaignId: string; regionId: string; characterId: string; presentNpcIds: string[] }
): {
  logBookEntries: SlimLogEntry[]
  playerAlignment: Alignment | null
  pendingAlignmentShift: PendingAlignmentShift | null
  combatSummary: ReturnType<typeof buildCombatSummaryForNarration>
  equippedWeaponSummary: string | undefined
  inactiveLivingPlayersInRegion: Array<{ id: string; name: string; characterClass: string }> | undefined
  activeQuests: ActiveQuestContext[]
  knownSpells: KnownSpellContext[]
} {
  const { campaignId, regionId, characterId, presentNpcIds } = input
  const allLogEntries = listLogEntriesByCharacter(db, characterId)
  const logBookEntries = slimLogEntries(
    windowLogEntriesForNarration(allLogEntries, { regionId, presentNpcIds })
  )
  const character = getCharacterById(db, characterId)
  const encounter = getActiveEncounter(db, campaignId)
  const combatSummary = buildCombatSummaryForNarration(db, encounter)
  const weaponProfile = getEquippedWeaponDamageProfile(db, characterId)
  const equippedWeaponSummary =
    weaponProfile.characterItemId !== null ? summarizeWeaponProfile(weaponProfile) : undefined
  const inactiveLivingPlayersInRegion = listInactiveLivingPlayersInRegion(
    db,
    campaignId,
    regionId,
    characterId
  )
  return {
    logBookEntries,
    playerAlignment: character?.alignment ?? null,
    pendingAlignmentShift: character?.pendingAlignmentShift ?? null,
    combatSummary,
    equippedWeaponSummary,
    inactiveLivingPlayersInRegion:
      inactiveLivingPlayersInRegion.length > 0 ? inactiveLivingPlayersInRegion : undefined,
    activeQuests: loadActiveQuestsForCharacter(db, campaignId, characterId),
    knownSpells: loadKnownSpellsForNarration(db, characterId)
  }
}

function loadFactionPlaySection(
  db: Database.Database,
  input: { campaignId: string; characterId: string; playerInput?: string }
): string | undefined {
  const digest = loadDmFactionPlayContext(db, {
    campaignId: input.campaignId,
    characterId: input.characterId,
    playerInput: input.playerInput ?? ''
  })
  return digest ? buildDmFactionPlayPromptSection(digest) : undefined
}

export function loadNarrationContextFields(
  db: Database.Database,
  input: {
    campaignId: string
    regionId: string
    characterId: string
    playerInput?: string
  }
): {
  regionStatus: RegionStatus
  recentEvents: SlimEvent[]
  storyThreadState: { id: string; state: string; summary: string } | null
  presentNpcs: PresentNpcContext[]
  bestiaryRecall: SlimPresentBestiaryGrounding[]
  logBookEntries: SlimLogEntry[]
  playerAlignment: Alignment | null
  pendingAlignmentShift: PendingAlignmentShift | null
  combatSummary: ReturnType<typeof buildCombatSummaryForNarration>
  equippedWeaponSummary: string | undefined
  inactiveLivingPlayersInRegion: Array<{ id: string; name: string; characterClass: string }> | undefined
  activeQuests: ActiveQuestContext[]
  knownSpells: KnownSpellContext[]
  factionPlaySection?: string
  worldMutationDigest?: string
} {
  const world = loadNarrationWorldFields(db, input.campaignId, input.regionId, input.characterId)
  const characterFields = loadNarrationCharacterFields(db, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    characterId: input.characterId,
    presentNpcIds: world.presentNpcs.map((npc) => npc.id)
  })
  const factionPlaySection = loadFactionPlaySection(db, input)
  return {
    ...world,
    ...characterFields,
    ...(factionPlaySection ? { factionPlaySection } : {})
  }
}
