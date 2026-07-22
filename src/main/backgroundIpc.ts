import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { generateBackgroundStory } from '../agents/backgroundStory'
import { BACKGROUND_ROSTER, findBackgroundRosterEntry } from '../engine/characterBackground/roster'
import type {
  BackgroundApplyInput,
  BackgroundApplyResult,
  BackgroundGenerateStoryInput,
  BackgroundRosterEntry
} from '../shared/characterBackground/types'
import {
  CUSTOM_BACKGROUND_DESCRIPTION,
  normalizeBackgroundStory,
  resolveBackgroundRosterEntry,
  validateBackgroundApplyFields
} from '../shared/characterBackground/apply'
import { isCustomBackgroundKey, normalizeCustomBackgroundLabel } from '../shared/characterBackground/types'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById } from '../db/repositories/characters'
import { setGuidedCreationPhase } from '../db/repositories/guidedCreation'
import { resolveCharacterRaceContext } from './guidedCreationIdentity'
import { buildAgentProvider } from './campaignIpc'
import { getDb } from './db'

function abilityScoresFromCharacter(stats: Record<string, unknown>): Record<string, number> {
  const scores = stats.abilityScores as Record<string, number> | undefined
  return scores ?? { body: 10, agility: 10, mind: 10, presence: 10 }
}

export function getBackgroundRoster(): BackgroundRosterEntry[] {
  return BACKGROUND_ROSTER
}

function resolveGenerateBackgroundLabels(input: BackgroundGenerateStoryInput): {
  label: string
  description: string
} | null {
  if (isCustomBackgroundKey(input.backgroundKey)) {
    const label = normalizeCustomBackgroundLabel(input.backgroundCustomLabel)
    if (!label) {
      return null
    }
    return { label, description: CUSTOM_BACKGROUND_DESCRIPTION }
  }
  const entry = resolveBackgroundRosterEntry(BACKGROUND_ROSTER, input.backgroundKey)
  if (!entry) {
    return null
  }
  return { label: entry.label, description: entry.description }
}

export async function generateBackgroundStoryForCharacter(
  db: Database.Database,
  provider: ReturnType<typeof buildAgentProvider>,
  input: BackgroundGenerateStoryInput
): Promise<string> {
  const labels = resolveGenerateBackgroundLabels(input)
  if (!labels) {
    throw new Error('invalid_background_key')
  }

  const character = getCharacterById(db, input.characterId)
  const campaign = getCampaignById(db, input.campaignId)
  if (!character || !campaign || character.campaignId !== input.campaignId) {
    throw new Error('character_not_found')
  }

  const raceContext = resolveCharacterRaceContext(db, input.campaignId, character.raceKey)
  const playerPrompt = input.playerPrompt?.trim() ? input.playerPrompt.trim() : null

  return generateBackgroundStory(provider, {
    characterName: character.name,
    archetype: character.characterClass,
    abilityScores: abilityScoresFromCharacter(character.stats),
    raceLabel: raceContext.raceName,
    raceLore: raceContext.raceLore,
    campaignPremise: campaign.premisePrompt,
    worldSummary: campaign.worldSummary || campaign.currentStateSummary,
    backgroundLabel: labels.label,
    backgroundDescription: labels.description,
    playerPrompt,
    existingStory: character.backgroundStory
  })
}

export async function applyBackgroundSelection(
  db: Database.Database,
  input: BackgroundApplyInput
): Promise<BackgroundApplyResult> {
  const character = getCharacterById(db, input.characterId)
  if (!character || character.campaignId !== input.campaignId) {
    return { ok: false, reason: 'character_not_found' }
  }
  if (character.guidedCreationPhase !== 'background') {
    return { ok: false, reason: 'invalid_phase' }
  }

  const validated = validateBackgroundApplyFields(input)
  if (!validated.ok) {
    return { ok: false, reason: validated.reason }
  }
  if (!isCustomBackgroundKey(validated.key) && !findBackgroundRosterEntry(validated.key)) {
    return { ok: false, reason: 'invalid_background_key' }
  }

  const story = normalizeBackgroundStory(input.backgroundStory)

  return db.transaction(() => {
    db.prepare(
      `UPDATE characters
       SET background_key = ?, background_story = ?, background_custom_label = ?
       WHERE id = ?`
    ).run(validated.key, story, validated.customLabel, input.characterId)
    setGuidedCreationPhase(db, input.characterId, 'equipment')
    return { ok: true as const }
  })()
}

export function registerBackgroundHandlers(): void {
  ipcMain.handle('background:getRoster', () => getBackgroundRoster())
  ipcMain.handle('background:generateStory', async (_event, input: BackgroundGenerateStoryInput) =>
    generateBackgroundStoryForCharacter(getDb(), buildAgentProvider(), input)
  )
  ipcMain.handle('background:apply', async (_event, input: BackgroundApplyInput) =>
    applyBackgroundSelection(getDb(), input)
  )
}
