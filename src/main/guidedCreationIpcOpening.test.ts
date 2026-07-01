import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createStoryThread } from '../db/repositories/storyThreads'
import { readGuidedCreationFields } from '../db/repositories/guidedCreation'
import { sendGuidedCreationMessage } from './guidedCreationIpc'

function seedOpeningSceneCampaign(db: ReturnType<typeof createTestDb>) {
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
  db.prepare(
    `UPDATE characters SET guided_creation_phase = 'opening_scene',
      identity_who = 'Kael', identity_why = 'Justice', identity_where = 'Oakhollow', identity_what = 'Fighter'
     WHERE id = ?`
  ).run(player.id)
  return { campaign, player }
}

describe('sendGuidedCreationMessage opening scene phase', () => {
  it('completes opening scene and advances phase when sceneReady', async () => {
    const db = createTestDb()
    const { campaign, player } = seedOpeningSceneCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'We begin in the rain.',
        proposedOpeningScene: 'Rain drums on the tavern roof.',
        sceneReady: true
      })
    ])

    const result = await sendGuidedCreationMessage(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene',
      message: 'Yes, start there.'
    })

    expect(result.ok).toBe(true)
    expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('complete')
  })
})
