import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createRegion } from '../db/repositories/regions'
import { createNpc } from '../db/repositories/npcs'
import { createPlayerCharacter } from '../main/characterCreationIpc'
import { createScriptedProvider } from './providers/mockHarness'
import { buildDefeatPrompt, proposeDefeatDisposition } from './defeatDisposition'
import type { Alignment } from '../shared/alignment/types'

function seedVictor(input: { role: string; backstory: string; alignment: Alignment }) {
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
    role: input.role,
    disposition: 'hostile',
    alignment: input.alignment,
    backstory: input.backstory,
    canSpeak: true
  })
  return { db, campaign, player, victor }
}

describe('proposeDefeatDisposition rules-first: lawful guard', () => {
  it('maps guard captain backstory to imprison with zero provider calls', async () => {
    const { campaign, player, victor } = seedVictor({
      role: 'guard captain',
      backstory: 'Mara led the town guard for twenty years before retiring.',
      alignment: 'lawful_good'
    })
    const provider = createScriptedProvider([])
    const proposal = await proposeDefeatDisposition(provider, {
      victor,
      player,
      deathMode: campaign.deathMode,
      encounterSummary: 'The guard captain prevailed.'
    })
    expect(proposal.disposition).toBe('imprison')
    expect(proposal.locationTag).toBeDefined()
    expect(proposal.narrationText).toContain('Mara')
    expect(provider.calls).toHaveLength(0)
  })
})

describe('proposeDefeatDisposition rules-first: reformed bandit', () => {
  it('maps backstory to bury_out_back with zero provider calls', async () => {
    const { campaign, player, victor } = seedVictor({
      role: 'reformed bandit',
      backstory: 'A former bandit who went straight after a decade on the road.',
      alignment: 'chaotic_good'
    })
    const provider = createScriptedProvider([])
    const proposal = await proposeDefeatDisposition(provider, {
      victor,
      player,
      deathMode: campaign.deathMode,
      encounterSummary: 'The reformed bandit won the brawl.'
    })
    expect(proposal.disposition).toBe('bury_out_back')
    expect(provider.calls).toHaveLength(0)
  })
})

describe('proposeDefeatDisposition non-speaking victor', () => {
  it('skips agent call', async () => {
    const { campaign, player, victor } = seedVictor({
      role: 'predator',
      backstory: '',
      alignment: 'true_neutral'
    })
    const wolf = { ...victor, canSpeak: false, name: 'Wolf', alignment: null }
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

describe('proposeDefeatDisposition ambiguous victor defers to the LLM', () => {
  it('calls the provider for an unmarked evil victor and uses its proposal', async () => {
    const { campaign, player, victor } = seedVictor({
      role: 'merchant',
      backstory: 'A trader with cold eyes and colder ledgers.',
      alignment: 'neutral_evil'
    })
    const provider = createScriptedProvider([
      JSON.stringify({
        disposition: 'ransom',
        narrationText: 'She has you trussed up and priced.',
        locationTag: 'the counting house cellar'
      })
    ])
    const proposal = await proposeDefeatDisposition(provider, {
      victor,
      player,
      deathMode: campaign.deathMode,
      encounterSummary: 'The merchant hired muscle.'
    })
    expect(proposal.disposition).toBe('ransom')
    expect(proposal.locationTag).toBe('the counting house cellar')
    expect(provider.calls).toHaveLength(1)
  })

  it('falls back to leave_unconscious when the agent fails schema on all attempts', async () => {
    const { campaign, player, victor } = seedVictor({
      role: 'merchant',
      backstory: 'A trader with cold eyes.',
      alignment: 'neutral_evil'
    })
    const provider = createScriptedProvider(['bad', 'bad', 'bad'])
    const proposal = await proposeDefeatDisposition(provider, {
      victor,
      player,
      deathMode: campaign.deathMode,
      encounterSummary: 'The merchant hired muscle.'
    })
    expect(proposal.disposition).toBe('leave_unconscious')
    expect(provider.calls).toHaveLength(3)
  })
})

describe('proposeDefeatDisposition: shared systemPrompt (040.9)', () => {
  it('moves the disposition schema into systemPrompt — user prompt keeps victor facts', async () => {
    const { campaign, player, victor } = seedVictor({
      role: 'merchant',
      backstory: 'A trader with cold eyes.',
      alignment: 'neutral_evil'
    })
    const provider = createScriptedProvider([
      JSON.stringify({ disposition: 'ransom', narrationText: 'Priced and packaged.' })
    ])

    await proposeDefeatDisposition(provider, {
      victor,
      player,
      deathMode: campaign.deathMode,
      encounterSummary: 'The merchant hired muscle.'
    })

    const call = provider.calls[0]!
    expect(call.prompt).toContain('Mara')
    expect(call.prompt).toContain('death mode:')
    expect(call.prompt).not.toContain('Respond ONLY with JSON')
    expect(call.prompt).not.toContain('Do not invent new victor biography')
    const system = call.context?.systemPrompt ?? ''
    expect(system).toContain('Respond ONLY with JSON: {"disposition":"imprison"')
    expect(system).toContain('Do not invent new victor biography')
    expect(system).toContain('no markdown fences')
  })

  it('passes the identical GenerateContext object on every retry attempt (data-integrity item 11)', async () => {
    const { campaign, player, victor } = seedVictor({
      role: 'merchant',
      backstory: 'A trader with cold eyes.',
      alignment: 'neutral_evil'
    })
    const provider = createScriptedProvider(['bad', 'bad', 'bad'])

    await proposeDefeatDisposition(provider, {
      victor,
      player,
      deathMode: campaign.deathMode,
      encounterSummary: 'The merchant hired muscle.'
    })

    expect(provider.calls).toHaveLength(3)
    const firstContext = provider.calls[0]?.context
    expect(firstContext?.systemPrompt).toBeTruthy()
    for (const call of provider.calls) {
      expect(call.context).toBe(firstContext)
    }
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
