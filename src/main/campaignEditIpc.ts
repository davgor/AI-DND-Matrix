import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import {
  updateCampaignDeathMode,
  type DeathMode,
  type RespawnRules
} from '../db/repositories/campaigns'
import { updateNpcDisposition } from '../db/repositories/npcs'
import { updateRegionDescription } from '../db/repositories/regions'
import { getCampaignDetail, type CampaignDetail } from './campaignIpc'
import { getDb } from './db'

export interface SetDeathModeInput {
  campaignId: string
  deathMode: DeathMode
  respawnRules?: RespawnRules | null
}

export function setCampaignDeathMode(db: Database.Database, input: SetDeathModeInput): CampaignDetail {
  updateCampaignDeathMode(db, input.campaignId, {
    deathMode: input.deathMode,
    respawnRules: input.respawnRules
  })
  return getCampaignDetail(db, input.campaignId)
}

export interface EditRegionDescriptionInput {
  campaignId: string
  regionId: string
  description: string
}

export function editRegionDescription(
  db: Database.Database,
  input: EditRegionDescriptionInput
): CampaignDetail {
  updateRegionDescription(db, input.regionId, input.description)
  return getCampaignDetail(db, input.campaignId)
}

export interface EditNpcDispositionInput {
  campaignId: string
  npcId: string
  disposition: string
}

export function editNpcDisposition(
  db: Database.Database,
  input: EditNpcDispositionInput
): CampaignDetail {
  updateNpcDisposition(db, input.npcId, input.disposition)
  return getCampaignDetail(db, input.campaignId)
}

export function registerCampaignEditHandlers(): void {
  ipcMain.handle('campaigns:setDeathMode', (_event, input: SetDeathModeInput) =>
    setCampaignDeathMode(getDb(), input)
  )

  ipcMain.handle('campaigns:editRegionDescription', (_event, input: EditRegionDescriptionInput) =>
    editRegionDescription(getDb(), input)
  )

  ipcMain.handle('campaigns:editNpcDisposition', (_event, input: EditNpcDispositionInput) =>
    editNpcDisposition(getDb(), input)
  )
}
