import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from './providers/mockHarness'
import { proposeYieldOutcome, buildYieldReviewInput } from './yieldReview'
import type { YieldReviewInput } from '../shared/npcCombat/types'

const farmerInput: YieldReviewInput = {
  npcName: 'Elara',
  npcRole: 'village farmer',
  alignment: 'true_neutral',
  temperament: 'neutral',
  canSpeak: true,
  combatTier: 'villager',
  backstory: 'A simple farmer who never wanted trouble. She grabbed her pitchfork only when cornered.',
  hp: 3,
  maxHp: 8,
  lethality: 'lethal',
  playerOffersMercy: false,
  allowedOutcomes: ['surrender', 'flee', 'incapacitated']
}

const fanaticInput: YieldReviewInput = {
  npcName: 'Brother Malachar',
  npcRole: 'cultist fanatic',
  alignment: 'chaotic_evil',
  temperament: 'aggressive',
  canSpeak: true,
  combatTier: 'catalog',
  backstory: 'A true believer who would die for the Void. Surrender is apostasy.',
  hp: 0,
  maxHp: 12,
  lethality: 'lethal',
  playerOffersMercy: false,
  allowedOutcomes: ['surrender', 'incapacitated']
}

const veteranInput: YieldReviewInput = {
  npcName: 'Old Bren',
  npcRole: 'retired mercenary',
  alignment: 'true_neutral',
  temperament: 'neutral',
  canSpeak: true,
  combatTier: 'retired_adventurer',
  backstory: 'Twenty campaigns behind him; he knows when a fight is lost — and when it is not.',
  hp: 2,
  maxHp: 20,
  lethality: 'lethal',
  playerOffersMercy: false,
  allowedOutcomes: ['surrender', 'flee', 'incapacitated']
}

describe('proposeYieldOutcome: rules-first, no LLM for clear-cut cases', () => {
  it('villager farmer surrenders with zero provider calls', async () => {
    const provider = createScriptedProvider([])
    const result = await proposeYieldOutcome(provider, farmerInput)
    expect(result.outcome).toBe('surrender')
    expect(result.narrationText).toContain('Elara')
    expect(provider.calls).toHaveLength(0)
  })

  it('aggressive fanatic fights on with zero provider calls', async () => {
    const provider = createScriptedProvider([])
    const result = await proposeYieldOutcome(provider, fanaticInput)
    expect(result.outcome).toBe('fight_on')
    expect(provider.calls).toHaveLength(0)
  })

  it('non-lethal attack incapacitates with zero provider calls', async () => {
    const provider = createScriptedProvider([])
    const result = await proposeYieldOutcome(provider, {
      ...farmerInput,
      lethality: 'non_lethal',
      allowedOutcomes: ['incapacitated']
    })
    expect(result.outcome).toBe('incapacitated')
    expect(result.outcome).not.toBe('slain')
    expect(provider.calls).toHaveLength(0)
  })
})

describe('proposeYieldOutcome: ambiguous veteran defers to the LLM', () => {
  it('calls the provider once and uses its outcome', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ outcome: 'surrender', narrationText: 'Bren plants his sword in the dirt.' })
    ])
    const result = await proposeYieldOutcome(provider, veteranInput)
    expect(result.outcome).toBe('surrender')
    expect(result.narrationText).toContain('sword')
    expect(provider.calls).toHaveLength(1)
  })

  it('falls back to a rules outcome when the agent fails schema on all attempts', async () => {
    const provider = createScriptedProvider(['not json', 'still not json', 'nope'])
    const result = await proposeYieldOutcome(provider, veteranInput)
    expect(['surrender', 'incapacitated', 'flee']).toContain(result.outcome)
    expect(result.narrationText.length).toBeGreaterThan(0)
    expect(provider.calls).toHaveLength(3)
  })

  it('rejects slain from the agent when mercy is offered', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ outcome: 'slain', narrationText: 'He dies.' }),
      JSON.stringify({ outcome: 'incapacitated', narrationText: 'He slumps unconscious.' })
    ])
    const result = await proposeYieldOutcome(provider, {
      ...veteranInput,
      playerOffersMercy: true,
      allowedOutcomes: ['slain', 'incapacitated', 'surrender']
    })
    expect(result.outcome).toBe('incapacitated')
  })
})

describe('buildYieldReviewInput', () => {
  it('builds a complete YieldReviewInput from NPC data', () => {
    const input = buildYieldReviewInput({
      npc: {
        name: 'Tom',
        role: 'guard',
        alignment: 'lawful_neutral',
        temperament: 'disciplined',
        canSpeak: true,
        combatTier: 'villager',
        backstory: 'Town guard, 10 years on the job.',
        hp: 4,
        maxHp: 10
      },
      lethality: 'lethal',
      playerOffersMercy: true,
      allowedOutcomes: ['surrender', 'flee', 'incapacitated']
    })
    expect(input.npcName).toBe('Tom')
    expect(input.hp).toBe(4)
    expect(input.maxHp).toBe(10)
    expect(input.playerOffersMercy).toBe(true)
    expect(input.allowedOutcomes).toContain('surrender')
  })
})
