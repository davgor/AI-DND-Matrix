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
import { readGuidedCreationFields, setGuidedCreationPhase } from './repositories/guidedCreation'
import { listGuidedCreationMessagesByCharacter } from './repositories/guidedCreationMessages'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Guided',
    premisePrompt: 'A haunted marsh.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: 'A village.' })
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
  return { campaign, player, region }
}

function identityScriptReplies(regionId: string): string[] {
  return [
    JSON.stringify({
      dmReply: 'Why are you adventuring?',
      foundations: {
        who: { complete: true, summary: 'Kael, a knight.' },
        why: { complete: false },
        where: { complete: false },
        what: { complete: false }
      },
      allFoundationsComplete: false
    }),
    JSON.stringify({
      dmReply: 'Where do you start?',
      foundations: {
        who: { complete: true, summary: 'Kael, a knight.' },
        why: { complete: true, summary: 'Justice.' },
        where: { complete: false },
        what: { complete: false }
      },
      allFoundationsComplete: false
    }),
    JSON.stringify({
      dmReply: 'What are you doing at the start?',
      foundations: {
        who: { complete: true, summary: 'Kael, a knight.' },
        why: { complete: true, summary: 'Justice.' },
        where: { complete: true, summary: 'Starts in Oakhollow.' },
        what: { complete: false }
      },
      allFoundationsComplete: false,
      startingRegionId: regionId
    }),
    JSON.stringify({
      dmReply: 'Locked in.',
      foundations: {
        who: { complete: true, summary: 'Kael, a knight.' },
        why: { complete: true, summary: 'Justice.' },
        where: { complete: true, summary: 'Starts in Oakhollow.' },
        what: { complete: true, summary: 'Guarding the gate.' }
      },
      allFoundationsComplete: true
    })
  ]
}

async function runIdentityPhase(
  db: ReturnType<typeof createTestDb>,
  campaignId: string,
  characterId: string,
  regionId: string
): Promise<void> {
  const identityProvider = createScriptedProvider(identityScriptReplies(regionId))
  const sendIdentity = (message: string) =>
    sendGuidedCreationMessage(db, identityProvider, {
      campaignId,
      characterId,
      phase: 'identity',
      message
    })
  expect((await sendIdentity('I am Kael, a knight.')).ok).toBe(true)
  expect((await sendIdentity('I seek justice.')).ok).toBe(true)
  expect((await sendIdentity('I start in Oakhollow.')).ok).toBe(true)
  const identityResult = await sendIdentity('I am guarding the gate.')
  expect(identityResult.ok).toBe(true)
  expect(readGuidedCreationFields(db, characterId)?.guidedCreationPhase).toBe('opening_scene')
}

async function runOpeningScenePhase(
  db: ReturnType<typeof createTestDb>,
  campaignId: string,
  characterId: string
): Promise<void> {
  const sceneProvider = createScriptedProvider([
    JSON.stringify({
      dmReply: 'We begin in the rain.',
      proposedOpeningScene: 'Rain drums on the tavern roof.',
      sceneReady: true
    })
  ])
  const sceneResult = await sendGuidedCreationMessage(db, sceneProvider, {
    campaignId,
    characterId,
    phase: 'opening_scene',
    message: 'Start in the tavern.'
  })
  expect(sceneResult.ok).toBe(true)
}

describe('guided creation end-to-end smoke', () => {
  it('runs identity and opening-scene phases then allows play entry', async () => {
    const db = createTestDb()
    const { campaign, player, region } = seedCampaign(db)
    expect(canEnterPlay(player)).toBe(false)
    setGuidedCreationPhase(db, player.id, 'identity')
    await runIdentityPhase(db, campaign.id, player.id, region.id)
    await runOpeningScenePhase(db, campaign.id, player.id)

    const fields = readGuidedCreationFields(db, player.id)
    expect(fields?.guidedCreationPhase).toBe('complete')
    expect(fields?.openingScene).toContain('tavern')
    expect(canEnterPlay({ ...player, ...fields! })).toBe(true)
    expect(buildNarrationLog(db, campaign.id).some((entry) => entry.text.includes('tavern'))).toBe(true)
    expect(listGuidedCreationMessagesByCharacter(db, player.id).length).toBeGreaterThanOrEqual(4)
  })
})
