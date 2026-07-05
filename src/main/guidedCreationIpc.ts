import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { runIdentityInterviewTurn } from '../agents/guidedIdentity'
import { runOpeningSceneTurn } from '../agents/guidedOpeningScene'
import type { Provider } from '../agents/providers/types'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById } from '../db/repositories/characters'
import { readGuidedCreationFields, readIdentityFoundationsStatus } from '../db/repositories/guidedCreation'
import {
  appendGuidedCreationMessage,
  listGuidedCreationMessagesByCharacter,
  listGuidedCreationMessagesByPhase
} from '../db/repositories/guidedCreationMessages'
import { listNpcsByRegion } from '../db/repositories/npcs'
import { listRegionsByCampaign } from '../db/repositories/regions'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import type {
  GuidedCreationFailureReason,
  GuidedCreationKickoffInput,
  GuidedCreationKickoffResult,
  GuidedCreationSendMessageInput,
  GuidedCreationSendMessageResult,
  GuidedCreationState
} from '../shared/guidedCreation/types'
import { buildAgentProvider } from './campaignIpc'
import { getDb } from './db'
import { kickoffIdentityInterviewIfNeeded, persistIdentityInterviewTurn, resolveCharacterRaceContext } from './guidedCreationIdentity'
import { buildOpeningSceneIdentity, persistOpeningSceneTurn } from './guidedCreationOpeningScene'

function failure(reason: GuidedCreationFailureReason): GuidedCreationSendMessageResult {
  return { ok: false, reason }
}

function validateSendInput(input: GuidedCreationSendMessageInput): GuidedCreationFailureReason | null {
  if (!input.message.trim()) {
    return 'empty_message'
  }
  return null
}

function buildGuidedCreationState(db: Database.Database, characterId: string): GuidedCreationState | undefined {
  const fields = readGuidedCreationFields(db, characterId)
  if (!fields) {
    return undefined
  }
  return {
    guidedCreationPhase: fields.guidedCreationPhase,
    foundations: readIdentityFoundationsStatus(db, characterId),
    openingScene: fields.openingScene,
    alignment: getCharacterById(db, characterId)?.alignment ?? null,
    messages: listGuidedCreationMessagesByCharacter(db, characterId)
  }
}

function abilityScoresFromCharacter(stats: Record<string, unknown>): Record<string, number> {
  const scores = stats.abilityScores as Record<string, number> | undefined
  return scores ?? { body: 10, agility: 10, mind: 10, presence: 10 }
}

async function handleIdentityMessage(
  db: Database.Database,
  provider: Provider,
  input: GuidedCreationSendMessageInput
): Promise<GuidedCreationSendMessageResult> {
  const character = getCharacterById(db, input.characterId)
  const campaign = getCampaignById(db, input.campaignId)
  if (!character || !campaign) {
    return failure('not_found')
  }

  appendGuidedCreationMessage(db, {
    campaignId: input.campaignId,
    characterId: input.characterId,
    phase: 'identity',
    role: 'player',
    content: input.message.trim()
  })

  const currentFoundations = readIdentityFoundationsStatus(db, character.id)
  const transcript = listGuidedCreationMessagesByPhase(db, character.id, 'identity').map((row) => ({
    role: row.role,
    content: row.content
  }))
  const raceContext = resolveCharacterRaceContext(db, input.campaignId, character.raceKey)

  let agentResult
  try {
    agentResult = await runIdentityInterviewTurn(
      provider,
      {
        campaignPremise: campaign.premisePrompt,
        characterName: character.name,
        characterClass: character.characterClass,
        abilityScores: abilityScoresFromCharacter(character.stats),
        alignment: character.alignment,
        raceName: raceContext.raceName,
        raceLore: raceContext.raceLore,
        transcript,
        currentFoundations
      },
      input.message.trim()
    )
  } catch {
    return failure('schema_error')
  }

  return persistIdentityInterviewTurn(db, {
    input,
    characterId: character.id,
    currentFoundations,
    agentResult
  })
}

async function handleOpeningSceneMessage(
  db: Database.Database,
  provider: Provider,
  input: GuidedCreationSendMessageInput
): Promise<GuidedCreationSendMessageResult> {
  const character = getCharacterById(db, input.characterId)
  const campaign = getCampaignById(db, input.campaignId)
  if (!character || !campaign) {
    return failure('not_found')
  }
  const fields = readGuidedCreationFields(db, character.id)
  if (!fields) {
    return failure('not_found')
  }

  appendGuidedCreationMessage(db, {
    campaignId: input.campaignId,
    characterId: input.characterId,
    phase: 'opening_scene',
    role: 'player',
    content: input.message.trim()
  })

  const regions = listRegionsByCampaign(db, input.campaignId)
  const npcs = regions.flatMap((region) => listNpcsByRegion(db, region.id))
  const [storyThread] = listStoryThreadsByCampaign(db, input.campaignId)
  const transcript = listGuidedCreationMessagesByPhase(db, character.id, 'opening_scene').map((row) => ({
    role: row.role,
    content: row.content
  }))

  let agentResult
  try {
    agentResult = await runOpeningSceneTurn(
      provider,
      {
        campaignPremise: campaign.premisePrompt,
        identity: buildOpeningSceneIdentity(fields, resolveCharacterRaceContext(db, input.campaignId, character.raceKey)),
        regions: regions.map((region) => ({ name: region.name, description: region.description })),
        npcs: npcs.map((npc) => ({ name: npc.name, role: npc.role, disposition: npc.disposition })),
        storyThread: storyThread
          ? { title: storyThread.title, state: storyThread.state, summary: storyThread.summary }
          : null,
        transcript,
        currentOpeningScene: fields.openingScene
      },
      input.message.trim()
    )
  } catch {
    return failure('schema_error')
  }

  return persistOpeningSceneTurn(db, input, character.id, agentResult)
}

export async function sendGuidedCreationMessage(
  db: Database.Database,
  provider: Provider,
  input: GuidedCreationSendMessageInput
): Promise<GuidedCreationSendMessageResult> {
  const validationError = validateSendInput(input)
  if (validationError) {
    return failure(validationError)
  }

  const character = getCharacterById(db, input.characterId)
  if (!character || character.campaignId !== input.campaignId) {
    return failure('not_found')
  }

  const fields = readGuidedCreationFields(db, character.id)
  if (!fields || fields.guidedCreationPhase !== input.phase) {
    return failure('invalid_phase')
  }

  if (input.phase === 'identity') {
    return handleIdentityMessage(db, provider, input)
  }
  return handleOpeningSceneMessage(db, provider, input)
}

export function getGuidedCreationState(
  db: Database.Database,
  characterId: string
): GuidedCreationState | undefined {
  return buildGuidedCreationState(db, characterId)
}

export async function kickoffGuidedCreationIdentity(
  db: Database.Database,
  provider: Provider,
  input: GuidedCreationKickoffInput
): Promise<GuidedCreationKickoffResult> {
  try {
    return await kickoffIdentityInterviewIfNeeded(db, provider, input)
  } catch {
    return { ok: false, reason: 'provider_error' }
  }
}

export function registerGuidedCreationHandlers(): void {
  ipcMain.handle('guidedCreation:getState', (_event, characterId: string) =>
    getGuidedCreationState(getDb(), characterId)
  )
  ipcMain.handle('guidedCreation:sendMessage', async (_event, input: GuidedCreationSendMessageInput) => {
    try {
      return await sendGuidedCreationMessage(getDb(), buildAgentProvider(), input)
    } catch {
      return failure('provider_error')
    }
  })
  ipcMain.handle('guidedCreation:kickoffIdentity', async (_event, input: GuidedCreationKickoffInput) =>
    kickoffGuidedCreationIdentity(getDb(), buildAgentProvider(), input)
  )
}
