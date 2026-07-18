import type Database from 'better-sqlite3'
import {
  openingSceneKickoffFallback,
  runOpeningSceneKickoff,
  type OpeningSceneResponse
} from '../agents/guidedOpeningScene'
import type { Provider } from '../agents/providers/types'
import type { CharacterGuidedCreationFields } from '../shared/guidedCreation/types'
import type {
  GuidedCreationKickoffInput,
  GuidedCreationKickoffResult,
  GuidedCreationSendMessageInput,
  GuidedCreationSendMessageResult
} from '../shared/guidedCreation/types'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById, type Character } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import {
  completeOpeningScenePhase,
  readGuidedCreationFields,
  readIdentityFoundationsStatus,
  setOpeningScene
} from '../db/repositories/guidedCreation'
import {
  appendGuidedCreationMessage,
  listGuidedCreationMessagesByPhase
} from '../db/repositories/guidedCreationMessages'
import { listNpcsByRegion } from '../db/repositories/npcs'
import { listRegionsByCampaign } from '../db/repositories/regions'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import type { RaceLore } from '../shared/raceSelection/types'
import { isOpeningSceneConfirmation } from '../shared/guidedCreation/isOpeningSceneConfirmation'
import { resolveOpeningSceneForReady } from '../shared/guidedCreation/resolveOpeningSceneForReady'
import { abilityScoresFromCharacter } from './guidedCreationAgentContext'
import { resolveCharacterBackgroundContext, resolveCharacterRaceContext } from './guidedCreationIdentity'

export function persistOpeningSceneTurn(
  db: Database.Database,
  input: GuidedCreationSendMessageInput,
  characterId: string,
  agentResult: OpeningSceneResponse
): GuidedCreationSendMessageResult {
  const existing = readGuidedCreationFields(db, characterId)
  const sceneForReady = resolveOpeningSceneForReady(
    agentResult.proposedOpeningScene,
    existing?.openingScene ?? null
  )
  const sceneReady =
    (agentResult.sceneReady || isOpeningSceneConfirmation(input.message)) && Boolean(sceneForReady)

  db.transaction(() => {
    if (agentResult.proposedOpeningScene) {
      setOpeningScene(db, characterId, agentResult.proposedOpeningScene)
    }
    appendGuidedCreationMessage(db, {
      campaignId: input.campaignId,
      characterId: input.characterId,
      phase: 'opening_scene',
      role: 'dm',
      content: agentResult.dmReply
    })
    if (sceneReady && sceneForReady) {
      completeOpeningScenePhase(db, characterId, sceneForReady)
      appendEvent(db, {
        campaignId: input.campaignId,
        type: 'opening_scene',
        payload: { narrationText: sceneForReady, characterId }
      })
    }
  })()

  const updated = readGuidedCreationFields(db, characterId)!
  return {
    ok: true,
    dmReply: agentResult.dmReply,
    guidedCreationPhase: updated.guidedCreationPhase,
    sceneReady,
    proposedOpeningScene: agentResult.proposedOpeningScene ?? sceneForReady,
    foundations: readIdentityFoundationsStatus(db, characterId)
  }
}

function buildOpeningSceneIdentity(
  fields: CharacterGuidedCreationFields,
  raceContext: { raceName: string | null; raceLore: RaceLore | null },
  backgroundContext: {
    backgroundLabel: string | null
    backgroundDescription: string | null
    backgroundStory: string | null
  },
  abilityScores: Record<string, number>
) {
  return {
    identityWho: fields.identityWho,
    identityWhy: fields.identityWhy,
    identityWhere: fields.identityWhere,
    identityWhat: fields.identityWhat,
    abilityScores,
    raceName: raceContext.raceName,
    raceLore: raceContext.raceLore,
    backgroundLabel: backgroundContext.backgroundLabel,
    backgroundDescription: backgroundContext.backgroundDescription,
    backgroundStory: backgroundContext.backgroundStory
  }
}

export function buildOpeningSceneAgentContext(
  db: Database.Database,
  input: { campaignId: string; characterId: string },
  character: Character,
  fields: CharacterGuidedCreationFields
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
      resolveCharacterBackgroundContext(character.backgroundKey, character.backgroundStory),
      abilityScoresFromCharacter(character.stats)
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

function persistOpeningSceneKickoff(
  db: Database.Database,
  input: GuidedCreationKickoffInput,
  agentResult: OpeningSceneResponse
): void {
  db.transaction(() => {
    if (agentResult.proposedOpeningScene) {
      setOpeningScene(db, input.characterId, agentResult.proposedOpeningScene)
    }
    appendGuidedCreationMessage(db, {
      campaignId: input.campaignId,
      characterId: input.characterId,
      phase: 'opening_scene',
      role: 'dm',
      content: agentResult.dmReply
    })
  })()
}

export async function kickoffOpeningSceneIfNeeded(
  db: Database.Database,
  provider: Provider,
  input: GuidedCreationKickoffInput
): Promise<GuidedCreationKickoffResult> {
  const character = getCharacterById(db, input.characterId)
  const campaign = getCampaignById(db, input.campaignId)
  if (!character || !campaign || character.campaignId !== input.campaignId) {
    return { ok: false, reason: 'not_found' }
  }

  const fields = readGuidedCreationFields(db, character.id)
  if (!fields || fields.guidedCreationPhase !== 'opening_scene') {
    return { ok: false, reason: 'invalid_phase' }
  }

  if (listGuidedCreationMessagesByPhase(db, character.id, 'opening_scene').length > 0) {
    return { ok: true, kickedOff: false }
  }

  let agentResult: OpeningSceneResponse
  try {
    const ctx = buildOpeningSceneAgentContext(db, input, character, fields)
    agentResult = await runOpeningSceneKickoff(provider, {
      campaignPremise: ctx.campaignPremise,
      identity: ctx.identity,
      regions: ctx.regions,
      npcs: ctx.npcs,
      storyThread: ctx.storyThread,
      currentOpeningScene: ctx.currentOpeningScene
    })
  } catch {
    agentResult = openingSceneKickoffFallback(fields.identityWhere)
  }

  persistOpeningSceneKickoff(db, input, agentResult)
  return { ok: true, kickedOff: true }
}
