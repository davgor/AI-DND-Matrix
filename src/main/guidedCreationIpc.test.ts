import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createStoryThread } from '../db/repositories/storyThreads'
import { listGuidedCreationMessagesByCharacter } from '../db/repositories/guidedCreationMessages'
import { setGuidedCreationPhase } from '../db/repositories/guidedCreation'
import { sendGuidedCreationMessage, kickoffGuidedCreationIdentity } from './guidedCreationIpc'

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
  setGuidedCreationPhase(db, player.id, 'identity')
  return { campaign, player }
}

describe('kickoffGuidedCreationIdentity', () => {
  it('persists a who-focused DM opener when identity phase has no messages', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Who are you, beyond the name on your sheet?'
      })
    ])

    const result = await kickoffGuidedCreationIdentity(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })

    expect(result).toEqual({ ok: true, kickedOff: true })
    const messages = listGuidedCreationMessagesByCharacter(db, player.id)
    expect(messages).toHaveLength(1)
    expect(messages[0]?.role).toBe('dm')
    expect(messages[0]?.content).toContain('Who')
  })

  it('is idempotent when identity messages already exist', async () => {
    const db = createTestDb()
    const { campaign, player } = seedGuidedCampaign(db)
    const provider = createScriptedProvider([
      JSON.stringify({ dmReply: 'Who are you?' }),
      JSON.stringify({ dmReply: 'Should not be used.' })
    ])

    await kickoffGuidedCreationIdentity(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })
    const second = await kickoffGuidedCreationIdentity(db, provider, {
      campaignId: campaign.id,
      characterId: player.id
    })

    expect(second).toEqual({ ok: true, kickedOff: false })
    expect(listGuidedCreationMessagesByCharacter(db, player.id)).toHaveLength(1)
    expect(provider.calls).toHaveLength(1)
  })
})

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
