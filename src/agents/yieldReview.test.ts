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

describe('proposeYieldOutcome: farmer surrenders', () => {
  it('returns surrender for mundane farmer at threshold', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ outcome: 'surrender', narrationText: 'Elara drops her pitchfork and weeps.' })
    ])
    const result = await proposeYieldOutcome(provider, farmerInput)
    expect(result.outcome).toBe('surrender')
    expect(result.narrationText).toContain('pitchfork')
    expect(provider.calls).toHaveLength(1)
  })

  it('falls back to default when agent returns invalid JSON', async () => {
    const provider = createScriptedProvider(['not json', 'still not json', 'nope'])
    const result = await proposeYieldOutcome(provider, farmerInput)
    expect(['surrender', 'incapacitated', 'flee']).toContain(result.outcome)
  })
})

describe('proposeYieldOutcome: fanatic may fight_on', () => {
  it('accepts fight_on for an aggressive fanatic', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ outcome: 'fight_on', narrationText: 'Malachar snarls and swings wildly.' })
    ])
    const result = await proposeYieldOutcome(provider, fanaticInput)
    expect(result.outcome).toBe('fight_on')
  })
})

describe('proposeYieldOutcome: non-lethal never slain', () => {
  it('returns incapacitated when non-lethal and agent fails schema', async () => {
    const nonLethalInput: YieldReviewInput = {
      ...farmerInput,
      lethality: 'non_lethal',
      allowedOutcomes: ['incapacitated']
    }
    const provider = createScriptedProvider(['bad', 'bad', 'bad'])
    const result = await proposeYieldOutcome(provider, nonLethalInput)
    expect(result.outcome).toBe('incapacitated')
    expect(result.outcome).not.toBe('slain')
  })

  it('rejects slain from agent when lethality is non_lethal', async () => {
    const nonLethalInput: YieldReviewInput = {
      ...farmerInput,
      lethality: 'non_lethal',
      allowedOutcomes: ['incapacitated', 'surrender']
    }
    const provider = createScriptedProvider([
      JSON.stringify({ outcome: 'slain', narrationText: 'She dies.' }),
      JSON.stringify({ outcome: 'incapacitated', narrationText: 'She slumps unconscious.' })
    ])
    const result = await proposeYieldOutcome(provider, nonLethalInput)
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
