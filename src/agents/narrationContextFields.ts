import type Database from 'better-sqlite3'
import type { Alignment, PendingAlignmentShift } from '../shared/alignment/types'
import { getCharacterById, listPlayerCharacters } from '../db/repositories/characters'
import { listEventsByCampaign, type Event } from '../db/repositories/events'
import { listNpcsByRegion } from '../db/repositories/npcs'
import { getRegionById, type RegionStatus } from '../db/repositories/regions'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { listLogEntriesByCharacter } from '../db/repositories/logEntries'
import { getEquippedWeaponDamageProfile, summarizeWeaponProfile } from '../db/repositories/weaponDamageProfile'
import { getActiveEncounter } from '../db/repositories/combatEncounters'
import { buildCombatSummaryForNarration } from './dmCombatContext'
import { takeRecent } from './contextWindow'
import { windowLogEntriesForNarration } from './logBookWindow'
import { loadActiveQuestsForCharacter } from './narrationQuestContext'
import { loadKnownSpellsForNarration } from './narrationSpellContext'
import type { LogEntry } from '../shared/logBook/types'
import type { ActiveQuestContext } from './questWindow'
import type { KnownSpellContext } from './spellWindow'

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
  regionId: string
): {
  regionStatus: RegionStatus
  recentEvents: Event[]
  storyThreadState: { id: string; state: string; summary: string } | null
  presentNpcs: { id: string; name: string }[]
} {
  const region = getRegionById(db, regionId)
  const recentEvents = takeRecent(listEventsByCampaign(db, campaignId))
  const [primaryThread] = listStoryThreadsByCampaign(db, campaignId)
  const presentNpcs = listNpcsByRegion(db, regionId)
    .filter((npc) => !npc.isPartyMember)
    .map((npc) => ({ id: npc.id, name: npc.name }))
  return {
    regionStatus: region?.status ?? { destroyed: false },
    recentEvents,
    storyThreadState: primaryThread
      ? { id: primaryThread.id, state: primaryThread.state, summary: primaryThread.summary }
      : null,
    presentNpcs
  }
}

function loadNarrationCharacterFields(
  db: Database.Database,
  input: { campaignId: string; regionId: string; characterId: string; presentNpcIds: string[] }
): {
  logBookEntries: LogEntry[]
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
  const logBookEntries = windowLogEntriesForNarration(allLogEntries, { regionId, presentNpcIds })
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

export function loadNarrationContextFields(
  db: Database.Database,
  input: {
    campaignId: string
    regionId: string
    characterId: string
  }
): {
  regionStatus: RegionStatus
  recentEvents: Event[]
  storyThreadState: { id: string; state: string; summary: string } | null
  presentNpcs: { id: string; name: string }[]
  logBookEntries: LogEntry[]
  playerAlignment: Alignment | null
  pendingAlignmentShift: PendingAlignmentShift | null
  combatSummary: ReturnType<typeof buildCombatSummaryForNarration>
  equippedWeaponSummary: string | undefined
  inactiveLivingPlayersInRegion: Array<{ id: string; name: string; characterClass: string }> | undefined
  activeQuests: ActiveQuestContext[]
  knownSpells: KnownSpellContext[]
} {
  const world = loadNarrationWorldFields(db, input.campaignId, input.regionId)
  const characterFields = loadNarrationCharacterFields(db, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    characterId: input.characterId,
    presentNpcIds: world.presentNpcs.map((npc) => npc.id)
  })
  return { ...world, ...characterFields }
}
