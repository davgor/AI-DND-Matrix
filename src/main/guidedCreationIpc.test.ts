import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createStoryThread } from '../db/repositories/storyThreads'
import { listGuidedCreationMessagesByCharacter } from '../db/repositories/guidedCreationMessages'
import { sendGuidedCreationMessage } from './guidedCreationIpc'

function seedGuidedCampaign(db: ReturnType<typeof createTestDb>) {
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

describe('sendGuidedCreationMessage identity phase', () => {
  it('persists identity-phase messages and foundation summaries', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Who are you?',
        foundations: {
          who: { complete: true, summary: 'Kael, a knight.' },
          why: { complete: false },
          where: { complete: false },
          what: { complete: false }
        },
        allFoundationsComplete: false
      })
    ])

    const result = await sendGuidedCreationMessage(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'identity',
      message: 'I am Kael.'
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.foundations?.who.complete).toBe(true)
    }
    expect(listGuidedCreationMessagesByCharacter(db, player.id)).toHaveLength(2)
  })

  it('rejects messages sent in the wrong phase', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider([])
    const result = await sendGuidedCreationMessage(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      phase: 'opening_scene',
      message: 'Start in the tavern.'
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_phase' })
  })
})
