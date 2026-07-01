import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createStoryThread } from '../db/repositories/storyThreads'
import { readGuidedCreationFields } from '../db/repositories/guidedCreation'
import { listGuidedCreationMessagesByCharacter, appendGuidedCreationMessage } from '../db/repositories/guidedCreationMessages'
import { kickoffGuidedCreationOpeningScene, readyGuidedCreationToEnterPlay, sendGuidedCreationMessage } from './guidedCreationIpc'
import { buildNarrationLog } from './narrationLog'

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

describe('kickoffGuidedCreationOpeningScene', () => {
  it('persists a DM opener when opening scene phase has no messages', async () => {
    const db = createTestDb()
    const { campaign, player } = seedOpeningSceneCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Where should our story begin?'
      })
    ])

    const result = await kickoffGuidedCreationOpeningScene(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })

    expect(result).toEqual({ ok: true, kickedOff: true })
    expect(listGuidedCreationMessagesByCharacter(db, player.id)).toHaveLength(1)
    expect(listGuidedCreationMessagesByCharacter(db, player.id)[0]?.content).toContain('begin')
  })
})

describe('readyGuidedCreationToEnterPlay', () => {
  it('finalizes opening scene and imports transcript into play log', async () => {
    const db = createTestDb()
    const { campaign, player } = seedOpeningSceneCampaign(db)
    appendGuidedCreationMessage(db, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene',
      role: 'dm',
      content: 'Where should we begin?',
      createdAt: '2026-01-01T00:00:00.000Z'
    })
    appendGuidedCreationMessage(db, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene',
      role: 'player',
      content: 'The tavern.',
      createdAt: '2026-01-01T00:00:01.000Z'
    })

    const result = await readyGuidedCreationToEnterPlay(db, {
      campaignId: campaign.id,
      characterId: player.id
    })

    expect(result).toEqual({ ok: true, guidedCreationPhase: 'complete' })
    expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('complete')
    expect(buildNarrationLog(db, campaign.id, player.id).map((entry) => entry.text)).toEqual([
      'Where should we begin?',
      'The tavern.'
    ])
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
    expect(buildNarrationLog(db, campaign.id, player.id).some((entry) => entry.text.includes('rain'))).toBe(
      true
    )
  })
})
