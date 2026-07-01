import type Database from 'better-sqlite3'
import {
  openingSceneKickoffFallback,
  runOpeningSceneKickoff,
  type OpeningSceneResponse
} from '../agents/guidedOpeningScene'
import type { Provider } from '../agents/providers/types'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById } from '../db/repositories/characters'
import type { CharacterGuidedCreationFields } from '../shared/guidedCreation/types'
import type {
  GuidedCreationKickoffInput,
  GuidedCreationKickoffResult,
  GuidedCreationSendMessageInput,
  GuidedCreationSendMessageResult
} from '../shared/guidedCreation/types'
import {
  completeOpeningScenePhase,
  readGuidedCreationFields,
  readIdentityFoundationsStatus,
  setOpeningScene
} from '../db/repositories/guidedCreation'
import { importOpeningSceneTranscriptToNarrationLog } from './guidedCreationPlayHandoff'
import {
  appendGuidedCreationMessage,
  listGuidedCreationMessagesByPhase
} from '../db/repositories/guidedCreationMessages'
import { listNpcsByRegion } from '../db/repositories/npcs'
import { listRegionsByCampaign } from '../db/repositories/regions'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'

export async function kickoffOpeningSceneInterviewIfNeeded(
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

  const regions = listRegionsByCampaign(db, input.campaignId)
  const npcs = regions.flatMap((region) => listNpcsByRegion(db, region.id))
  const [storyThread] = listStoryThreadsByCampaign(db, input.campaignId)

  let dmReply: string
  try {
    const kickoff = await runOpeningSceneKickoff(provider, {
      campaignPremise: campaign.premisePrompt,
      identity: buildOpeningSceneIdentity(fields),
      regions: regions.map((region) => ({ name: region.name, description: region.description })),
      npcs: npcs.map((npc) => ({ name: npc.name, role: npc.role, disposition: npc.disposition })),
      storyThread: storyThread
        ? { title: storyThread.title, state: storyThread.state, summary: storyThread.summary }
        : null
    })
    dmReply = kickoff.dmReply
  } catch {
    dmReply = openingSceneKickoffFallback()
  }

  appendGuidedCreationMessage(db, {
    campaignId: input.campaignId,
    characterId: input.characterId,
    phase: 'opening_scene',
    role: 'dm',
    content: dmReply
  })

  return { ok: true, kickedOff: true }
}

export function persistOpeningSceneTurn(
  db: Database.Database,
  input: GuidedCreationSendMessageInput,
  characterId: string,
  agentResult: OpeningSceneResponse
): GuidedCreationSendMessageResult {
  let importTranscript = false

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
    if (agentResult.sceneReady && agentResult.proposedOpeningScene) {
      completeOpeningScenePhase(db, characterId, agentResult.proposedOpeningScene)
      importTranscript = true
    }
  })()

  if (importTranscript) {
    importOpeningSceneTranscriptToNarrationLog(db, input.campaignId, characterId)
  }

  const updated = readGuidedCreationFields(db, characterId)!
  return {
    ok: true,
    dmReply: agentResult.dmReply,
    guidedCreationPhase: updated.guidedCreationPhase,
    sceneReady: agentResult.sceneReady,
    proposedOpeningScene: agentResult.proposedOpeningScene,
    foundations: readIdentityFoundationsStatus(db, characterId)
  }
}

export function buildOpeningSceneIdentity(fields: CharacterGuidedCreationFields) {
  return {
    identityWho: fields.identityWho,
    identityWhy: fields.identityWhy,
    identityWhere: fields.identityWhere,
    identityWhat: fields.identityWhat
  }
}
