import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createStoryThread } from '../db/repositories/storyThreads'
import { listGuidedCreationMessagesByCharacter } from '../db/repositories/guidedCreationMessages'
import { readGuidedCreationFields } from '../db/repositories/guidedCreation'
import { kickoffGuidedCreationOpeningScene, sendGuidedCreationMessage } from './guidedCreationIpc'

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

function expectOpeningKickoffPersisted(db: ReturnType<typeof createTestDb>, playerId: string): void {
  const messages = listGuidedCreationMessagesByCharacter(db, playerId)
  expect(messages).toHaveLength(1)
  expect(messages[0]?.role).toBe('dm')
  expect(messages[0]?.phase).toBe('opening_scene')
  expect(messages[0]?.content).toContain('look good')
  expect(readGuidedCreationFields(db, playerId)?.openingScene).toContain('village gate')
  expect(readGuidedCreationFields(db, playerId)?.guidedCreationPhase).toBe('opening_scene')
}

describe('kickoffGuidedCreationOpeningScene', () => {
  it('persists a DM opener with proposed scene when opening-scene phase has no messages', async () => {
    const db = createTestDb()
    const { campaign, player } = seedOpeningSceneCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'You stand at the village gate. Does this look good to you?',
        proposedOpeningScene: 'You stand at the village gate as mist rolls in.',
        sceneReady: false
      })
    ])

    const result = await kickoffGuidedCreationOpeningScene(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })

    expect(result).toEqual({ ok: true, kickedOff: true })
    expectOpeningKickoffPersisted(db, player.id)
  })

  it('is idempotent when opening-scene messages already exist', async () => {
    const db = createTestDb()
    const { campaign, player } = seedOpeningSceneCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'First opener. Does this look good to you?',
        proposedOpeningScene: 'First scene.',
        sceneReady: false
      }),
      JSON.stringify({
        dmReply: 'Should not be used.',
        proposedOpeningScene: 'Second scene.',
        sceneReady: false
      })
    ])
    const ids = { campaignId: campaign.id, characterId: player.id }

    await kickoffGuidedCreationOpeningScene(db, provider, ids)
    const second = await kickoffGuidedCreationOpeningScene(db, provider, ids)

    expect(second).toEqual({ ok: true, kickedOff: false })
    expect(listGuidedCreationMessagesByCharacter(db, player.id)).toHaveLength(1)
    expect(provider.calls).toHaveLength(1)
  })
})

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

  it('completes when sceneReady even if proposedOpeningScene is null (uses persisted scene)', async () => {
    const db = createTestDb()
    const { campaign, player } = seedOpeningSceneCampaign(db)
    db.prepare(`UPDATE characters SET opening_scene = ? WHERE id = ?`).run(
      'You wake among Melromarc fields as goblins rush the grain.',
      player.id
    )
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Perfect — the opening scene is locked in.',
        proposedOpeningScene: null,
        sceneReady: true
      })
    ])

    const result = await sendGuidedCreationMessage(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene',
      message: 'Yup that works for me'
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.sceneReady).toBe(true)
      expect(result.guidedCreationPhase).toBe('complete')
    }
    const fields = readGuidedCreationFields(db, player.id)
    expect(fields?.guidedCreationPhase).toBe('complete')
    expect(fields?.openingScene).toContain('Melromarc')
  })
})
