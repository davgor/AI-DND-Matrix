import { describe, expect, it } from 'vitest'
import { MAX_SCHEMA_ATTEMPTS } from './jsonResponse'
import {
  IDENTITY_TRANSCRIPT_WINDOW,
  allFoundationsComplete,
  identityWhoKickoffFallback,
  mergeFoundationStatus,
  runIdentityInterviewKickoff,
  runIdentityInterviewTurn,
  defaultIdentityFoundations
} from './guidedIdentity'
import { createScriptedProvider } from './providers/mockHarness'

const SAMPLE_REGIONS = [
  { id: 'region-oak', name: 'Oakhollow', description: 'A quiet village.' },
  { id: 'region-mire', name: 'Blackmire', description: 'A flooded fen.' }
]

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
  startingGear: [
    { name: 'Longsword', equippedSlot: 'mainHand' },
    { name: 'Chain Hauberk', equippedSlot: 'armor' }
  ],
  knownSpellNames: ['Rallying Strike'],
  companions: [],
  regions: SAMPLE_REGIONS,
  transcript: [] as Array<{ role: 'player' | 'dm'; content: string }>,
  currentFoundations: defaultIdentityFoundations()
}

const VALID_TURN_RESPONSE = JSON.stringify({
  dmReply: 'Tell me more about your past.',
  foundations: {
    who: { complete: true, summary: 'Kael, a wandering knight.' },
    why: { complete: false },
    where: { complete: false },
    what: { complete: false }
  },
  allFoundationsComplete: false
})

function buildTranscript(turnCount: number, earlyContent: string): Array<{ role: 'player' | 'dm'; content: string }> {
  return Array.from({ length: turnCount }, (_, index) => ({
    role: index % 2 === 0 ? ('player' as const) : ('dm' as const),
    content: index < IDENTITY_TRANSCRIPT_WINDOW ? `${earlyContent} turn ${index + 1}` : `late turn ${index + 1}`
  }))
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
      backgroundStory: IDENTITY_INTERVIEW_CONTEXT.backgroundStory,
      startingGear: IDENTITY_INTERVIEW_CONTEXT.startingGear,
      knownSpellNames: IDENTITY_INTERVIEW_CONTEXT.knownSpellNames,
      companions: [],
      regions: IDENTITY_INTERVIEW_CONTEXT.regions
    })
    expect(result.dmReply.toLowerCase()).toContain('who')
    const systemPrompt = provider.calls[0]?.context?.systemPrompt ?? ''
    expect(systemPrompt).toContain('Kael')
    expect(systemPrompt).toContain('Elf')
    expect(systemPrompt).toContain('lawful_good')
    expect(systemPrompt).toContain('Longsword')
    expect(systemPrompt).toContain('Chain Hauberk')
    expect(systemPrompt).toContain('Rallying Strike')
    expect(systemPrompt).toContain('Oakhollow')
    expect(systemPrompt).toContain('Blackmire')
    expect(systemPrompt).toContain('concise')
    expect(systemPrompt.toLowerCase()).toContain('do not restate')
    expect(systemPrompt.toLowerCase()).toContain('established setup')
    expect(systemPrompt.toLowerCase()).toMatch(/do not invent an opening scene/)
    expect(provider.calls[0]?.prompt).toContain('concise')
    expect(provider.calls[0]?.prompt.toLowerCase()).toContain('established setup')
    expect(provider.calls[0]?.prompt.toLowerCase()).toMatch(/do not invent an opening scene/)
    expect(provider.calls[0]?.context?.maxTokens).toBe(384)
  })
})

describe('identityWhoKickoffFallback', () => {
  it('names the character in the fallback opener', () => {
    expect(identityWhoKickoffFallback('Kael')).toContain('Kael')
  })
})

describe('runIdentityInterviewKickoff background context', () => {
  it('includes background label, description, and untrusted story in the system prompt', async () => {
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
      backgroundStory: 'I marched on the northern border.',
      startingGear: [],
      knownSpellNames: [],
      companions: [],
      regions: IDENTITY_INTERVIEW_CONTEXT.regions
    })
    const systemPrompt = provider.calls[0]?.context?.systemPrompt ?? ''
    expect(systemPrompt).toContain('Soldier')
    expect(systemPrompt).toContain('You served in an army.')
    expect(systemPrompt).toContain('I marched on the northern border.')
    expect(systemPrompt).toContain('untrusted narrative content')
  })
})

describe('runIdentityInterviewTurn', () => {
  it('returns partial foundation completion from a valid response', async () => {
    const provider = createScriptedProvider([VALID_TURN_RESPONSE])
    const result = await runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'I am Kael.')
    expect(result.foundations.who.complete).toBe(true)
    expect(result.allFoundationsComplete).toBe(false)
    const systemPrompt = provider.calls[0]?.context?.systemPrompt ?? ''
    expect(systemPrompt).toContain('Kael')
    expect(systemPrompt).toContain('Elf')
    expect(systemPrompt).toContain('lawful_good')
    expect(systemPrompt).toContain('Oakhollow')
    expect(systemPrompt).toContain('which of these generated regions')
    expect(systemPrompt).toContain('concise')
    expect(systemPrompt.toLowerCase()).toContain('do not restate')
    expect(systemPrompt.toLowerCase()).toContain('short distinguishing phrase')
    expect(systemPrompt).toMatch(/never recite score numbers/i)
    expect(provider.calls[0]?.context?.maxTokens).toBe(384)
  })

  it('sends the static identity block via systemPrompt, not the user prompt', async () => {
    const provider = createScriptedProvider([VALID_TURN_RESPONSE])
    await runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'I am Kael.')
    const call = provider.calls[0]!
    expect(call.context?.systemPrompt).toContain('Reclusive forest folk.')
    expect(call.context?.systemPrompt).toContain('A flooded kingdom.')
    expect(call.prompt).not.toContain('Reclusive forest folk.')
    expect(call.prompt).not.toContain('A flooded kingdom.')
    expect(call.prompt).not.toContain('abilityScores')
  })

  it('retries with the same systemPrompt on invalid responses', async () => {
    const provider = createScriptedProvider(['not json', VALID_TURN_RESPONSE])
    const result = await runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'Done.')
    expect(result.foundations.who.complete).toBe(true)
    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[1]?.context?.systemPrompt).toBe(provider.calls[0]?.context?.systemPrompt)
    expect(provider.calls[0]?.context?.systemPrompt).toContain('Reclusive forest folk.')
  })

  it('throws after exhausting schema retries', async () => {
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])
    await expect(runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'x')).rejects.toThrow()
    expect(provider.calls).toHaveLength(MAX_SCHEMA_ATTEMPTS)
  })
})

describe('runIdentityInterviewTurn starting region', () => {
  it('accepts startingRegionId when Where locks to a listed region', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Oakhollow it is.',
        foundations: {
          who: { complete: true, summary: 'Kael' },
          why: { complete: true, summary: 'Justice' },
          where: { complete: true, summary: 'Starts in Oakhollow; grew up nearby.' },
          what: { complete: true, summary: 'Fighter' }
        },
        allFoundationsComplete: true,
        startingRegionId: 'region-oak'
      })
    ])
    const result = await runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'Oakhollow.')
    expect(result.startingRegionId).toBe('region-oak')
    expect(result.foundations.where.complete).toBe(true)
  })

  it('retries when Where completes without a valid startingRegionId', async () => {
    const valid = JSON.stringify({
      dmReply: 'Oakhollow it is.',
      foundations: {
        who: { complete: true, summary: 'Kael' },
        why: { complete: true, summary: 'Justice' },
        where: { complete: true, summary: 'Starts in Oakhollow.' },
        what: { complete: true, summary: 'Fighter' }
      },
      allFoundationsComplete: true,
      startingRegionId: 'region-oak'
    })
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Somewhere.',
        foundations: {
          who: { complete: true, summary: 'Kael' },
          why: { complete: true, summary: 'Justice' },
          where: { complete: true, summary: 'A distant land.' },
          what: { complete: true, summary: 'Fighter' }
        },
        allFoundationsComplete: true
      }),
      valid
    ])
    const result = await runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'Far away.')
    expect(result.startingRegionId).toBe('region-oak')
    expect(provider.calls).toHaveLength(2)
  })
})

describe('runIdentityInterviewTurn transcript windowing', () => {
  it('includes at most the last 5 transcript turns in the prompt', async () => {
    const provider = createScriptedProvider([VALID_TURN_RESPONSE])
    const context = { ...IDENTITY_INTERVIEW_CONTEXT, transcript: buildTranscript(10, 'early') }
    await runIdentityInterviewTurn(provider, context, 'Latest.')
    const prompt = provider.calls[0]?.prompt ?? ''
    expect(prompt).not.toContain('early turn 1')
    expect(prompt).not.toContain('early turn 5')
    expect(prompt).toContain('late turn 6')
    expect(prompt).toContain('late turn 10')
  })

  it('produces an identical prompt for a 10-turn fixture regardless of turns 1-5 content', async () => {
    const shortEarly = createScriptedProvider([VALID_TURN_RESPONSE])
    const longEarly = createScriptedProvider([VALID_TURN_RESPONSE])
    await runIdentityInterviewTurn(
      shortEarly,
      { ...IDENTITY_INTERVIEW_CONTEXT, transcript: buildTranscript(10, 'x') },
      'Latest.'
    )
    await runIdentityInterviewTurn(
      longEarly,
      { ...IDENTITY_INTERVIEW_CONTEXT, transcript: buildTranscript(10, 'a much longer early exchange about lineage '.repeat(20)) },
      'Latest.'
    )
    expect(shortEarly.calls[0]?.prompt).toBe(longEarly.calls[0]?.prompt)
  })

  it('keeps locked foundation summaries in the prompt when their turns aged out', async () => {
    const provider = createScriptedProvider([VALID_TURN_RESPONSE])
    const currentFoundations = defaultIdentityFoundations()
    currentFoundations.who = { complete: true, summary: 'Kael, sworn knight of the drowned court.' }
    const context = {
      ...IDENTITY_INTERVIEW_CONTEXT,
      transcript: buildTranscript(10, 'early'),
      currentFoundations
    }
    await runIdentityInterviewTurn(provider, context, 'Latest.')
    expect(provider.calls[0]?.prompt).toContain('Kael, sworn knight of the drowned court.')
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

  it('keeps the first locked summary when the model re-emits complete with a different summary', () => {
    const current = defaultIdentityFoundations()
    current.who = { complete: true, summary: 'Kael, a wandering knight with a detailed past.' }
    const merged = mergeFoundationStatus(current, {
      ...defaultIdentityFoundations(),
      who: { complete: true, summary: 'Kael.' }
    })
    expect(merged.who).toEqual({ complete: true, summary: 'Kael, a wandering knight with a detailed past.' })
  })
})
