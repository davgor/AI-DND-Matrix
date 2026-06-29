import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { sendGuidedCreationMessage } from '../main/guidedCreationIpc'
import { buildNarrationLog } from '../main/narrationLog'
import { canEnterPlay } from '../shared/guidedCreation/stageRouting'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createRegion } from './repositories/regions'
import { createStoryThread } from './repositories/storyThreads'
import { readGuidedCreationFields } from './repositories/guidedCreation'
import { listGuidedCreationMessagesByCharacter } from './repositories/guidedCreationMessages'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Guided',
    premisePrompt: 'A haunted marsh.',
    deathMode: 'legendary'
  })
  createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: 'A village.' })
  createStoryThread(db, {
    campaignId: campaign.id,
    title: 'Main',
    state: 'starting',
    summary: 'Something stirs.'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
  })
  return { campaign, player }
}

describe('guided creation end-to-end smoke', () => {
  it('runs identity and opening-scene phases then allows play entry', async () => {
    const db = createTestDb()
    const { campaign, player } = seedCampaign(db)
    expect(canEnterPlay(player)).toBe(false)

    const identityProvider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Tell me more.',
        foundations: {
          who: { complete: true, summary: 'Kael, a knight.' },
          why: { complete: true, summary: 'Justice.' },
          where: { complete: true, summary: 'Oakhollow.' },
          what: { complete: true, summary: 'Steadfast fighter.' }
        },
        allFoundationsComplete: true
      })
    ])
    const identityResult = await sendGuidedCreationMessage(db, identityProvider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'identity',
      message: 'I am Kael, a knight from Oakhollow seeking justice.'
    })
    expect(identityResult.ok).toBe(true)
    expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('opening_scene')

    const sceneProvider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'We begin in the rain.',
        proposedOpeningScene: 'Rain drums on the tavern roof.',
        sceneReady: true
      })
    ])
    const sceneResult = await sendGuidedCreationMessage(db, sceneProvider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene',
      message: 'Start in the tavern.'
    })
    expect(sceneResult.ok).toBe(true)

    const fields = readGuidedCreationFields(db, player.id)
    expect(fields?.guidedCreationPhase).toBe('complete')
    expect(fields?.openingScene).toContain('tavern')
    expect(canEnterPlay({ ...player, ...fields! })).toBe(true)
    expect(buildNarrationLog(db, campaign.id).some((entry) => entry.text.includes('tavern'))).toBe(true)
    expect(listGuidedCreationMessagesByCharacter(db, player.id).length).toBeGreaterThanOrEqual(4)
  })
})
