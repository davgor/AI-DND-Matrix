import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import {
  generateCustomRaceKey,
  generateRaceLore
} from '../agents/raceLore'
import { findRosterEntry, isPresetRaceKey, RACE_ROSTER } from '../engine/raceSelection/roster'
import type { RaceCategory, RacePreviewLoreResult } from '../shared/raceSelection/types'
import type { RaceApplyInput, RaceApplyResult } from '../shared/raceSelection/types'
import { getCampaignById } from '../db/repositories/campaigns'
import {
  createCampaignRace,
  getCampaignRaceByKey,
  listCampaignRaces,
  setCharacterRaceKey
} from '../db/repositories/campaignRaces'
import { getCharacterById } from '../db/repositories/characters'
import { setGuidedCreationPhase } from '../db/repositories/guidedCreation'
import { buildAgentProvider } from './campaignIpc'
import { getDb } from './db'

export interface RaceRosterGroup {
  category: RaceCategory
  label: string
  entries: typeof RACE_ROSTER
}

const CATEGORY_LABELS: Record<RaceCategory, string> = {
  common_folk: 'Common Folk',
  outsider_bloodlines: 'Outsider Bloodlines',
  monstrous_feral: 'Monstrous & Feral',
  uncanny_otherworldly: 'Uncanny & Otherworldly'
}

export function getRaceRosterGrouped(): RaceRosterGroup[] {
  const categories = Object.keys(CATEGORY_LABELS) as RaceCategory[]
  return categories.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    entries: RACE_ROSTER.filter((entry) => entry.category === category)
  }))
}

export type PreviewLoreInput =
  | { campaignId: string; kind: 'preset'; raceKey: string }
  | { campaignId: string; kind: 'custom'; label: string; seedPrompt: string }

export async function previewRaceLore(
  db: Database.Database,
  provider: ReturnType<typeof buildAgentProvider>,
  input: PreviewLoreInput
): Promise<RacePreviewLoreResult> {
  const campaign = getCampaignById(db, input.campaignId)
  if (!campaign) {
    throw new Error('campaign_not_found')
  }

  if (input.kind === 'preset') {
    const existing = getCampaignRaceByKey(db, input.campaignId, input.raceKey)
    if (existing) {
      return { locked: true, lore: existing.lore }
    }
    const rosterEntry = findRosterEntry(input.raceKey)
    if (!rosterEntry) {
      throw new Error('invalid_race_key')
    }
    const lore = await generateRaceLore(
      provider,
      campaign.premisePrompt,
      campaign.currentStateSummary,
      {
        kind: 'preset',
        raceKey: rosterEntry.key,
        label: rosterEntry.label,
        seedPrompt: rosterEntry.seedPrompt
      }
    )
    return { locked: false, lore }
  }

  const lore = await generateRaceLore(
    provider,
    campaign.premisePrompt,
    campaign.currentStateSummary,
    {
      kind: 'custom',
      label: input.label,
      seedPrompt: input.seedPrompt
    }
  )
  return { locked: false, lore }
}

export async function applyRaceSelection(
  db: Database.Database,
  input: RaceApplyInput
): Promise<RaceApplyResult> {
  const character = getCharacterById(db, input.characterId)
  if (!character || character.campaignId !== input.campaignId) {
    return { ok: false, reason: 'character_not_found' }
  }
  if (character.guidedCreationPhase !== 'race') {
    return { ok: false, reason: 'invalid_phase' }
  }

  let raceKey = input.raceKey
  if (input.kind === 'preset') {
    if (!raceKey || !isPresetRaceKey(raceKey)) {
      return { ok: false, reason: 'invalid_race_key' }
    }
  } else if (character.raceKey) {
    const existingCustom = getCampaignRaceByKey(db, input.campaignId, character.raceKey)
    raceKey = existingCustom?.kind === 'custom' ? character.raceKey : generateCustomRaceKey()
  } else {
    raceKey = generateCustomRaceKey()
  }

  const resolvedKey = raceKey!

  return db.transaction(() => {
    const existing = getCampaignRaceByKey(db, input.campaignId, resolvedKey)
    if (!existing) {
      createCampaignRace(db, {
        campaignId: input.campaignId,
        raceKey: resolvedKey,
        kind: input.kind,
        label: input.label,
        seedPrompt: input.seedPrompt,
        lore: input.finalLore,
        createdByCharacterId: input.characterId
      })
    }

    setCharacterRaceKey(db, input.characterId, resolvedKey)
    setGuidedCreationPhase(db, input.characterId, 'background')
    return { ok: true, raceKey: resolvedKey }
  })()
}

export function registerRaceHandlers(): void {
  ipcMain.handle('race:getRoster', () => getRaceRosterGrouped())
  ipcMain.handle('race:getCampaignRaces', (_event, campaignId: string) =>
    listCampaignRaces(getDb(), campaignId)
  )
  ipcMain.handle('race:previewLore', async (_event, input: PreviewLoreInput) =>
    previewRaceLore(getDb(), buildAgentProvider(), input)
  )
  ipcMain.handle('race:apply', async (_event, input: RaceApplyInput) =>
    applyRaceSelection(getDb(), input)
  )
}

export function resolveRaceLabel(
  db: Database.Database,
  campaignId: string,
  raceKey: string | null
): string | null {
  if (!raceKey) {
    return null
  }
  const catalog = getCampaignRaceByKey(db, campaignId, raceKey)
  if (catalog) {
    return catalog.label
  }
  return findRosterEntry(raceKey)?.label ?? null
}
