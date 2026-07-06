import { describe, expect, it } from 'vitest'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import {
  allFoundationsComplete,
  identityWhoKickoffFallback,
  mergeFoundationStatus,
  runIdentityInterviewKickoff,
  runIdentityInterviewTurn,
  defaultIdentityFoundations
} from './guidedIdentity'
import { createScriptedProvider } from './providers/mockHarness'

const IDENTITY_INTERVIEW_CONTEXT = {
  campaignPremise: 'A flooded kingdom.',
  characterName: 'Kael',
  characterClass: 'fighter',
  abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
  alignment: 'lawful_good' as const,
  raceName: 'Elf',
  raceLore: {
    summary: 'Reclusive forest folk.',
    appearance: 'Slender.',
    culture: 'Old groves.',
    roleInThisLand: 'Keepers.',
    hooks: ['A dying grove.']
  },
  backgroundLabel: null,
  backgroundDescription: null,
  backgroundStory: null,
  transcript: [] as Array<{ role: 'player' | 'dm'; content: string }>,
  currentFoundations: defaultIdentityFoundations()
}

describe('runIdentityInterviewKickoff', () => {
  it('returns a who-focused opening prompt before the player speaks', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Before we begin — who are you? Tell me about Kael beyond the stats on your sheet.'
      })
    ])
    const result = await runIdentityInterviewKickoff(provider, {
      campaignPremise: IDENTITY_INTERVIEW_CONTEXT.campaignPremise,
      characterName: IDENTITY_INTERVIEW_CONTEXT.characterName,
      characterClass: IDENTITY_INTERVIEW_CONTEXT.characterClass,
      abilityScores: IDENTITY_INTERVIEW_CONTEXT.abilityScores,
      alignment: IDENTITY_INTERVIEW_CONTEXT.alignment,
      raceName: IDENTITY_INTERVIEW_CONTEXT.raceName,
      raceLore: IDENTITY_INTERVIEW_CONTEXT.raceLore,
      backgroundLabel: IDENTITY_INTERVIEW_CONTEXT.backgroundLabel,
      backgroundDescription: IDENTITY_INTERVIEW_CONTEXT.backgroundDescription,
      backgroundStory: IDENTITY_INTERVIEW_CONTEXT.backgroundStory
    })
    expect(result.dmReply.toLowerCase()).toContain('who')
    expect(provider.calls[0]?.prompt).toContain('Kael')
    expect(provider.calls[0]?.prompt).toContain('Elf')
    expect(provider.calls[0]?.prompt).toContain('lawful_good')
  })
})

describe('identityWhoKickoffFallback', () => {
  it('names the character in the fallback opener', () => {
    expect(identityWhoKickoffFallback('Kael')).toContain('Kael')
  })
})

describe('runIdentityInterviewKickoff background context', () => {
  it('includes background label, description, and untrusted story in the prompt', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Tell me more about your time in the ranks.'
      })
    ])
    await runIdentityInterviewKickoff(provider, {
      campaignPremise: IDENTITY_INTERVIEW_CONTEXT.campaignPremise,
      characterName: IDENTITY_INTERVIEW_CONTEXT.characterName,
      characterClass: IDENTITY_INTERVIEW_CONTEXT.characterClass,
      abilityScores: IDENTITY_INTERVIEW_CONTEXT.abilityScores,
      alignment: IDENTITY_INTERVIEW_CONTEXT.alignment,
      raceName: IDENTITY_INTERVIEW_CONTEXT.raceName,
      raceLore: IDENTITY_INTERVIEW_CONTEXT.raceLore,
      backgroundLabel: 'Soldier',
      backgroundDescription: 'You served in an army.',
      backgroundStory: 'I marched on the northern border.'
    })
    expect(provider.calls[0]?.prompt).toContain('Soldier')
    expect(provider.calls[0]?.prompt).toContain('You served in an army.')
    expect(provider.calls[0]?.prompt).toContain('I marched on the northern border.')
    expect(provider.calls[0]?.prompt).toContain('untrusted narrative content')
  })
})

describe('runIdentityInterviewTurn', () => {
  it('returns partial foundation completion from a valid response', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Tell me more about your past.',
        foundations: {
          who: { complete: true, summary: 'Kael, a wandering knight.' },
          why: { complete: false },
          where: { complete: false },
          what: { complete: false }
        },
        allFoundationsComplete: false
      })
    ])
    const result = await runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'I am Kael.')
    expect(result.foundations.who.complete).toBe(true)
    expect(result.allFoundationsComplete).toBe(false)
    expect(provider.calls[0]?.prompt).toContain('Kael')
    expect(provider.calls[0]?.prompt).toContain('Elf')
    expect(provider.calls[0]?.prompt).toContain('lawful_good')
  })

  it('includes race and alignment in interview-turn prompts', async () => {
    const provider = createScriptedProvider([
      'not json',
      JSON.stringify({
        dmReply: 'All set.',
        foundations: {
          who: { complete: true, summary: 'Kael' },
          why: { complete: true, summary: 'Justice' },
          where: { complete: true, summary: 'Oakhollow' },
          what: { complete: true, summary: 'Steadfast fighter' }
        },
        allFoundationsComplete: true
      })
    ])
    const result = await runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'Done.')
    expect(result.allFoundationsComplete).toBe(true)
    expect(provider.calls).toHaveLength(2)
  })

  it('throws after exhausting schema retries', async () => {
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])
    await expect(runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'x')).rejects.toThrow()
    expect(provider.calls).toHaveLength(MAX_SCHEMA_ATTEMPTS)
  })
})

describe('foundation status helpers', () => {
  it('merges newly completed foundations without dropping prior summaries', () => {
    const current = defaultIdentityFoundations()
    current.who = { complete: true, summary: 'Kael' }
    const merged = mergeFoundationStatus(current, {
      ...defaultIdentityFoundations(),
      why: { complete: true, summary: 'Justice' }
    })
    expect(merged.who.summary).toBe('Kael')
    expect(merged.why.summary).toBe('Justice')
    expect(allFoundationsComplete(merged)).toBe(false)
  })
})
