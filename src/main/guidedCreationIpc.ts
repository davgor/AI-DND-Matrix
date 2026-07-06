import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { runIdentityInterviewTurn } from '../agents/guidedIdentity'
import { runOpeningSceneTurn } from '../agents/guidedOpeningScene'
import type { Provider } from '../agents/providers/types'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById } from '../db/repositories/characters'
import { readGuidedCreationFields, readIdentityFoundationsStatus, setGuidedCreationPhase } from '../db/repositories/guidedCreation'
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
  GuidedCreationRevertPhaseInput,
  GuidedCreationRevertPhaseResult,
  GuidedCreationSendMessageInput,
  GuidedCreationSendMessageResult,
  GuidedCreationState
} from '../shared/guidedCreation/types'
import { canRevertGuidedCreationPhase, type RevertibleOnboardingPhase } from '../shared/guidedCreation/revertPhase'
import { buildAgentProvider } from './campaignIpc'
import { getDb } from './db'
import { kickoffIdentityInterviewIfNeeded, persistIdentityInterviewTurn } from './guidedCreationIdentity'
import { buildIdentityInterviewAgentContext } from './guidedCreationAgentContext'
import { buildOpeningSceneIdentity, persistOpeningSceneTurn } from './guidedCreationOpeningScene'
import { resolveCharacterBackgroundContext, resolveCharacterRaceContext } from './guidedCreationIdentity'

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

function buildOpeningSceneAgentContext(
  db: Database.Database,
  input: GuidedCreationSendMessageInput,
  character: NonNullable<ReturnType<typeof getCharacterById>>,
  fields: NonNullable<ReturnType<typeof readGuidedCreationFields>>
) {
  const regions = listRegionsByCampaign(db, input.campaignId)
  const npcs = regions.flatMap((region) => listNpcsByRegion(db, region.id))
  const [storyThread] = listStoryThreadsByCampaign(db, input.campaignId)
  const transcript = listGuidedCreationMessagesByPhase(db, character.id, 'opening_scene').map((row) => ({
    role: row.role,
    content: row.content
  }))
  return {
    campaignPremise: getCampaignById(db, input.campaignId)!.premisePrompt,
    identity: buildOpeningSceneIdentity(
      fields,
      resolveCharacterRaceContext(db, input.campaignId, character.raceKey),
      resolveCharacterBackgroundContext(character.backgroundKey, character.backgroundStory)
    ),
    regions: regions.map((region) => ({ name: region.name, description: region.description })),
    npcs: npcs.map((npc) => ({ name: npc.name, role: npc.role, disposition: npc.disposition })),
    storyThread: storyThread
      ? { title: storyThread.title, state: storyThread.state, summary: storyThread.summary }
      : null,
    transcript,
    currentOpeningScene: fields.openingScene
  }
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

  let agentResult
  try {
    agentResult = await runIdentityInterviewTurn(
      provider,
      buildIdentityInterviewAgentContext({
        db,
        campaignId: input.campaignId,
        campaignPremise: campaign.premisePrompt,
        character,
        transcript,
        currentFoundations
      }),
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

  let agentResult
  try {
    agentResult = await runOpeningSceneTurn(
      provider,
      buildOpeningSceneAgentContext(db, input, character, fields),
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

export function revertGuidedCreationPhase(
  db: Database.Database,
  input: GuidedCreationRevertPhaseInput
): GuidedCreationRevertPhaseResult {
  const character = getCharacterById(db, input.characterId)
  if (!character) {
    return { ok: false, reason: 'not_found' }
  }
  const targetPhase = input.targetPhase as RevertibleOnboardingPhase
  if (!canRevertGuidedCreationPhase(character.guidedCreationPhase, targetPhase)) {
    return { ok: false, reason: 'invalid_revert' }
  }
  setGuidedCreationPhase(db, input.characterId, targetPhase)
  return { ok: true }
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
  ipcMain.handle('guidedCreation:revertPhase', (_event, input: GuidedCreationRevertPhaseInput) =>
    revertGuidedCreationPhase(getDb(), input)
  )
}
