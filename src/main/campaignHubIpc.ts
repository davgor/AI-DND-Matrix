import type Database from 'better-sqlite3'
import { ipcMain } from 'electron'
import type {
  PlayAwareHubSnapshot,
  HubCastMember,
  HubCharacterQuestSummary,
  HubRegionQuestAvailability
} from '../shared/campaignHub/types'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById, listCharactersByCampaign } from '../db/repositories/characters'
import { listDeitiesByCampaign } from '../db/repositories/deities'
import {
  listFactionRelationsByCampaign,
  listFactionsByCampaign
} from '../db/repositories/factions'
import { listNpcsByRegion } from '../db/repositories/npcs'
import { listRegionsByCampaign } from '../db/repositories/regions'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { getMainQuestByCampaign, listCharacterQuests, listQuestsByCampaign } from '../db/repositories/quests'
import { buildRegionExtras, type CampaignDetail } from './campaignIpc'
import { getDb } from './db'

function regionNameForCharacter(
  db: Database.Database,
  campaignId: string,
  characterId: string
): string | null {
  const character = getCharacterById(db, characterId)
  const regionId = (character?.stats as { currentRegionId?: string } | undefined)?.currentRegionId
  if (!regionId) {
    return null
  }
  return listRegionsByCampaign(db, campaignId).find((region) => region.id === regionId)?.name ?? null
}

function buildCast(db: Database.Database, campaignId: string): HubCastMember[] {
  return listCharactersByCampaign(db, campaignId)
    .filter((character) => character.kind === 'player')
    .map((character) => ({
      id: character.id,
      name: character.name,
      characterClass: character.characterClass,
      level: character.level,
      portraitPath: character.portraitPath,
      lifeStatus: character.lifeStatus,
      lastKnownRegionName: regionNameForCharacter(db, campaignId, character.id),
      hasObituary: character.obituary !== null,
      obituary: character.obituary ?? undefined
    }))
}

function buildQuestSummaries(db: Database.Database, campaignId: string): HubCharacterQuestSummary[] {
  const mainQuest = getMainQuestByCampaign(db, campaignId)
  const quests = listQuestsByCampaign(db, campaignId)
  const sideQuestIds = new Set(quests.filter((quest) => quest.kind === 'side').map((quest) => quest.id))
  return listCharactersByCampaign(db, campaignId)
    .filter((character) => character.kind === 'player')
    .map((character) => {
      const memberships = listCharacterQuests(db, character.id)
      const activeSideQuestCount = memberships.filter(
        (row) => sideQuestIds.has(row.questId) && row.status === 'active'
      ).length
      return {
        characterId: character.id,
        mainQuestHookLine: mainQuest?.hookLine ?? null,
        mainQuestTitle: mainQuest?.title ?? null,
        activeSideQuestCount
      }
    })
}

function buildRegionQuestAvailability(
  db: Database.Database,
  campaignId: string,
  regions: ReturnType<typeof listRegionsByCampaign>
): HubRegionQuestAvailability[] {
  const quests = listQuestsByCampaign(db, campaignId).filter((quest) => quest.kind === 'side')
  return regions.map((region) => ({
    regionId: region.id,
    availableQuestCount: quests.filter((quest) => quest.regionId === region.id).length
  }))
}

export function buildHubSnapshot(db: Database.Database, campaignId: string): PlayAwareHubSnapshot {
  const campaign = getCampaignById(db, campaignId)
  const regions = listRegionsByCampaign(db, campaignId)
  const detail: CampaignDetail = {
    campaign,
    regions,
    npcs: regions.flatMap((region) => listNpcsByRegion(db, region.id)),
    regionExtras: buildRegionExtras(db, campaignId),
    storyThreads: listStoryThreadsByCampaign(db, campaignId),
    characters: listCharactersByCampaign(db, campaignId),
    deities: listDeitiesByCampaign(db, campaignId),
    factions: listFactionsByCampaign(db, campaignId),
    factionRelations: listFactionRelationsByCampaign(db, campaignId),
    bestiary: []
  }

  return {
    ...detail,
    currentStateSummary: campaign?.currentStateSummary ?? '',
    cast: buildCast(db, campaignId),
    questSummariesByCharacterId: buildQuestSummaries(db, campaignId),
    regionQuestAvailability: buildRegionQuestAvailability(db, campaignId, regions)
  }
}

export function registerCampaignHubHandlers(): void {
  ipcMain.handle('campaigns:getHubSnapshot', (_event, campaignId: string) =>
    buildHubSnapshot(getDb(), campaignId)
  )
}
