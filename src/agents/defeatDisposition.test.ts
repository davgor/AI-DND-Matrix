import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createNpc } from '../db/repositories/npcs'
import { createPlayerCharacter } from '../main/characterCreationIpc'
import { createScriptedProvider } from './providers/mockHarness'
import { buildDefeatPrompt, proposeDefeatDisposition } from './defeatDisposition'

function seedVictor(backstory: string, alignment: 'lawful_good' | 'chaotic_good') {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test',
    premisePrompt: 'A town',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A town'
  })
  const player = createPlayerCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    archetype: 'fighter',
    abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
    alignment: 'neutral_good'
  })
  const victor = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mara',
    role: 'guard captain',
    disposition: 'hostile',
    alignment,
    backstory,
    canSpeak: true
  })
  return { db, campaign, player, victor }
}

describe('proposeDefeatDisposition lawful guard', () => {
  it('maps guard captain backstory to imprison', async () => {
    const { campaign, player, victor } = seedVictor(
      'Mara led the town guard for twenty years before retiring.',
      'lawful_good'
    )
    const provider = createScriptedProvider([
      JSON.stringify({
        disposition: 'imprison',
        narrationText: 'Iron cuffs close around your wrists.'
      })
    ])
    const proposal = await proposeDefeatDisposition(provider, {
      victor,
      player,
      deathMode: campaign.deathMode,
      encounterSummary: 'The guard captain prevailed.'
    })
    expect(proposal.disposition).toBe('imprison')
  })
})

describe('proposeDefeatDisposition reformed bandit', () => {
  it('maps backstory to bury_out_back', async () => {
    const { campaign, player, victor } = seedVictor(
      'A former bandit who went straight after a decade on the road.',
      'chaotic_good'
    )
    const provider = createScriptedProvider([
      JSON.stringify({
        disposition: 'bury_out_back',
        narrationText: 'They drag you behind the stables and shovel cold earth over you.'
      })
    ])
    const proposal = await proposeDefeatDisposition(provider, {
      victor,
      player,
      deathMode: campaign.deathMode,
      encounterSummary: 'The reformed bandit won the brawl.'
    })
    expect(proposal.disposition).toBe('bury_out_back')
  })
})

describe('proposeDefeatDisposition non-speaking victor', () => {
  it('skips agent call', async () => {
    const { campaign, player, victor } = seedVictor('', 'true_neutral' as 'lawful_good')
    const wolf = { ...victor, canSpeak: false, name: 'Wolf' }
    const provider = createScriptedProvider([])
    const proposal = await proposeDefeatDisposition(provider, {
      victor: wolf,
      player,
      deathMode: campaign.deathMode,
      encounterSummary: 'A wolf mauling.'
    })
    expect(proposal.disposition).toBe('leave_unconscious')
    expect(provider.calls).toHaveLength(0)
  })
})

describe('buildDefeatPrompt', () => {
  it('includes death mode and stored backstory', () => {
    const prompt = buildDefeatPrompt({
      victor: {
        name: 'Mara',
        role: 'guard',
        alignment: 'lawful_good',
        disposition: 'hostile',
        backstory: 'Retired guard captain.',
        canSpeak: true
      } as Parameters<typeof buildDefeatPrompt>[0]['victor'],
      player: { name: 'Kael' } as Parameters<typeof buildDefeatPrompt>[0]['player'],
      deathMode: 'standard',
      encounterSummary: 'A duel.'
    })
    expect(prompt).toContain('death mode: standard')
    expect(prompt).toContain('Retired guard captain')
    expect(prompt).toContain('do not contradict')
  })
})
