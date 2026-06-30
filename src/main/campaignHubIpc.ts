import type Database from 'better-sqlite3'
import { ipcMain } from 'electron'
import type { PlayAwareHubSnapshot, HubCastMember, HubRecentEvent } from '../shared/campaignHub/types'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById, listCharactersByCampaign } from '../db/repositories/characters'
import { listEventsByCampaign } from '../db/repositories/events'
import { listNpcsByRegion } from '../db/repositories/npcs'
import { listRegionsByCampaign } from '../db/repositories/regions'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { listCampaignsByLastPlayed } from '../db/repositories/campaigns'
import { buildRegionExtras, type CampaignDetail } from './campaignIpc'
import { getDb } from './db'

const RECENT_EVENTS_LIMIT = 20

function summarizeEventPayload(type: string, payload: Record<string, unknown>): string {
  if (typeof payload.narrationText === 'string') {
    return payload.narrationText
  }
  if (typeof payload.playerInput === 'string') {
    return payload.playerInput
  }
  return type.replace(/_/g, ' ')
}

function buildRecentEvents(db: Database.Database, campaignId: string): HubRecentEvent[] {
  return listEventsByCampaign(db, campaignId, { limit: RECENT_EVENTS_LIMIT }).map((event) => ({
    id: event.id,
    type: event.type,
    createdAt: event.timestamp,
    summary: summarizeEventPayload(event.type, event.payload)
  }))
}

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

export function buildHubSnapshot(db: Database.Database, campaignId: string): PlayAwareHubSnapshot {
  const campaign = getCampaignById(db, campaignId)
  const regions = listRegionsByCampaign(db, campaignId)
  const detail: CampaignDetail = {
    campaign,
    regions,
    npcs: regions.flatMap((region) => listNpcsByRegion(db, region.id)),
    regionExtras: buildRegionExtras(db, campaignId),
    storyThreads: listStoryThreadsByCampaign(db, campaignId),
    characters: listCharactersByCampaign(db, campaignId)
  }

  return {
    ...detail,
    currentStateSummary: campaign?.currentStateSummary ?? '',
    recentEvents: buildRecentEvents(db, campaignId),
    cast: buildCast(db, campaignId)
  }
}

export function getCampaignLastPlayed(db: Database.Database, campaignId: string): string {
  const campaign = getCampaignById(db, campaignId)
  const row = listCampaignsByLastPlayed(db).find((entry) => entry.id === campaignId)
  return row?.lastPlayedAt ?? campaign?.createdAt ?? ''
}

export function registerCampaignHubHandlers(): void {
  ipcMain.handle('campaigns:getHubSnapshot', (_event, campaignId: string) =>
    buildHubSnapshot(getDb(), campaignId)
  )
}
