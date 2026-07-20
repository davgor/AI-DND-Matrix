import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { runIdentityInterviewKickoff } from '../agents/guidedIdentity'
import { generateBackgroundStoryForCharacter } from '../main/backgroundIpc'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'

describe('character background integration generateStory', () => {
  it('generates without a player prompt and includes prompt text when provided', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'A realm.', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'background',
      stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
    })

    const bareProvider = createScriptedProvider(['A veteran of many campaigns.'])
    const bareStory = await generateBackgroundStoryForCharacter(db, bareProvider, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'soldier'
    })
    expect(bareStory.length).toBeGreaterThan(0)

    const promptProvider = createScriptedProvider(['Border marches define me.'])
    await generateBackgroundStoryForCharacter(db, promptProvider, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'soldier',
      playerPrompt: 'Mention the frost pass.'
    })
    expect(promptProvider.calls[0]?.prompt).toContain('Mention the frost pass.')
  })
})

describe('character background integration identity omit', () => {
  it('omits background from identity kickoff when character has none', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'A realm.', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Legacy',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'identity',
      stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
    })
    const provider = createScriptedProvider([JSON.stringify({ dmReply: 'Who are you?' })])
    await runIdentityInterviewKickoff(provider, {
      campaignPremise: campaign.premisePrompt,
      characterName: player.name,
      characterClass: player.characterClass,
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      alignment: null,
      raceName: null,
      raceLore: null,
      backgroundLabel: null,
      backgroundDescription: null,
      backgroundStory: null,
      startingGear: [],
      knownSpellNames: [],
      regions: []
    })
    expect(provider.calls[0]?.prompt).not.toContain('backgroundDescription')
  })
})
