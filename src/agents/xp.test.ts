import { describe, expect, it } from 'vitest'
import { buildXpPrompt, resolveXpAward, XP_DIFFICULTY_MAX_TOKENS } from './xp'
import { createScriptedProvider } from './providers/mockHarness'
import type { XPContext } from '../shared/progression/types'

const questContext: XPContext = {
  source: 'quest_complete',
  foes: [],
  regionId: 'r1',
  playerLevel: 2,
  playerCharacterId: 'c1',
  campaignId: 'camp1',
  questHookText: 'Deliver grain.',
  questScale: 'minor'
}

const encounterContext: XPContext = {
  source: 'encounter_end',
  foes: [
    {
      npcId: 'n1',
      npcRole: 'thug',
      combatTier: 'catalog',
      buckets: ['humanoid'],
      outcome: 'slain'
    }
  ],
  regionId: 'r1',
  playerLevel: 1,
  playerCharacterId: 'c1',
  campaignId: 'camp1',
  roundCount: 3,
  partyMembers: [{ archetype: 'mage', level: 1 }]
}

describe('buildXpPrompt', () => {
  it('describes party comp and foes, asks for a difficulty rating only', () => {
    const prompt = buildXpPrompt(encounterContext)
    expect(prompt).toContain('level 1')
    expect(prompt).toContain('mage')
    expect(prompt).toContain('thug')
    expect(prompt).toContain('easy|medium|hard|extreme|impossible')
    expect(prompt).not.toContain('Budget')
    expect(prompt).not.toContain('xpAmount')
  })

  it('describes the quest for quest completions', () => {
    const prompt = buildXpPrompt(questContext)
    expect(prompt).toContain('Deliver grain.')
    expect(prompt).toContain('minor')
  })
})

describe('resolveXpAward', () => {
  it('converts the LLM difficulty rating into an engine-computed amount', async () => {
    const provider = createScriptedProvider([JSON.stringify({ difficulty: 'medium' })])
    const result = await resolveXpAward(provider, encounterContext)
    // Level 1 span 300, medium = 10% = 30
    expect(result.difficulty).toBe('medium')
    expect(result.xpAmount).toBe(30)
    expect(result.narrationText.length).toBeGreaterThan(0)
  })

  it('passes a small explicit maxTokens cap to the provider', async () => {
    const provider = createScriptedProvider([JSON.stringify({ difficulty: 'easy' })])
    await resolveXpAward(provider, encounterContext)
    expect(provider.calls[0]?.context?.maxTokens).toBe(XP_DIFFICULTY_MAX_TOKENS)
  })

  it('accepts case-insensitive difficulty values', async () => {
    const provider = createScriptedProvider([JSON.stringify({ difficulty: 'Hard' })])
    const result = await resolveXpAward(provider, encounterContext)
    expect(result.difficulty).toBe('hard')
    expect(result.xpAmount).toBe(60)
  })

  it('retries invalid ratings, then falls back to deterministic difficulty', async () => {
    const provider = createScriptedProvider([
      'not json',
      JSON.stringify({ difficulty: 'apocalyptic' }),
      JSON.stringify({ difficulty: 42 })
    ])
    const result = await resolveXpAward(provider, encounterContext)
    expect(provider.calls).toHaveLength(3)
    expect(result.difficulty).toBe('medium')
    expect(result.xpAmount).toBe(30)
  })

  it('falls back to hard for exhausted major quest ratings', async () => {
    const provider = createScriptedProvider(['bad', 'bad', 'bad'])
    const result = await resolveXpAward(provider, {
      ...questContext,
      questScale: 'major'
    })
    expect(result.difficulty).toBe('hard')
  })
})
