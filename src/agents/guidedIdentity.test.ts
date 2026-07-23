import { describe, expect, it } from 'vitest'
import { MAX_SCHEMA_ATTEMPTS } from './jsonResponse'
import {
  IDENTITY_TRANSCRIPT_WINDOW,
  allFoundationsComplete,
  foundationsAdvanceInOrder,
  identityWhoKickoffFallback,
  mergeFoundationStatus,
  nextIncompleteFoundation,
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

function whoWhyLocked() {
  const foundations = defaultIdentityFoundations()
  foundations.who = { complete: true, summary: 'Kael' }
  foundations.why = { complete: true, summary: 'Justice' }
  return foundations
}

function whoLocked(summary = 'Kael') {
  const foundations = defaultIdentityFoundations()
  foundations.who = { complete: true, summary }
  return foundations
}

function foundationPayload(
  dmReply: string,
  locks: Partial<Record<'who' | 'why' | 'where' | 'what', string>>,
  startingRegionId?: string
) {
  const foundations = {
    who: locks.who
      ? { complete: true as const, summary: locks.who }
      : { complete: false as const },
    why: locks.why
      ? { complete: true as const, summary: locks.why }
      : { complete: false as const },
    where: locks.where
      ? { complete: true as const, summary: locks.where }
      : { complete: false as const },
    what: locks.what
      ? { complete: true as const, summary: locks.what }
      : { complete: false as const }
  }
  return JSON.stringify({
    dmReply,
    foundations,
    allFoundationsComplete: Boolean(locks.who && locks.why && locks.where && locks.what),
    ...(startingRegionId ? { startingRegionId } : {})
  })
}

function buildTranscript(turnCount: number, earlyContent: string): Array<{ role: 'player' | 'dm'; content: string }> {
  return Array.from({ length: turnCount }, (_, index) => ({
    role: index % 2 === 0 ? ('player' as const) : ('dm' as const),
    content: index < IDENTITY_TRANSCRIPT_WINDOW ? `${earlyContent} turn ${index + 1}` : `late turn ${index + 1}`
  }))
}

function kickoffContext(overrides: {
  backgroundLabel?: string | null
  backgroundDescription?: string | null
  backgroundStory?: string | null
  startingGear?: typeof IDENTITY_INTERVIEW_CONTEXT.startingGear
  knownSpellNames?: string[]
} = {}) {
  return {
    campaignPremise: IDENTITY_INTERVIEW_CONTEXT.campaignPremise,
    characterName: IDENTITY_INTERVIEW_CONTEXT.characterName,
    characterClass: IDENTITY_INTERVIEW_CONTEXT.characterClass,
    abilityScores: IDENTITY_INTERVIEW_CONTEXT.abilityScores,
    alignment: IDENTITY_INTERVIEW_CONTEXT.alignment,
    raceName: IDENTITY_INTERVIEW_CONTEXT.raceName,
    raceLore: IDENTITY_INTERVIEW_CONTEXT.raceLore,
    backgroundLabel: IDENTITY_INTERVIEW_CONTEXT.backgroundLabel as string | null,
    backgroundDescription: IDENTITY_INTERVIEW_CONTEXT.backgroundDescription as string | null,
    backgroundStory: IDENTITY_INTERVIEW_CONTEXT.backgroundStory as string | null,
    startingGear: IDENTITY_INTERVIEW_CONTEXT.startingGear,
    knownSpellNames: IDENTITY_INTERVIEW_CONTEXT.knownSpellNames,
    companions: [] as typeof IDENTITY_INTERVIEW_CONTEXT.companions,
    regions: IDENTITY_INTERVIEW_CONTEXT.regions,
    ...overrides
  }
}

describe('runIdentityInterviewKickoff', () => {
  it('returns a who-focused opening prompt before the player speaks', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ dmReply: "You're Kael — any other details to add about who you are?" })
    ])
    const result = await runIdentityInterviewKickoff(provider, kickoffContext())
    expect(result.dmReply.toLowerCase()).toContain('who')
    const systemPrompt = provider.calls[0]?.context?.systemPrompt ?? ''
    expect(systemPrompt).toContain('Kael')
    expect(systemPrompt).toContain('Elf')
    expect(systemPrompt).toContain('Longsword')
    expect(systemPrompt).not.toContain('Oakhollow')
    expect(systemPrompt).not.toContain('Blackmire')
    expect(systemPrompt.toLowerCase()).toContain('established setup')
    expect(provider.calls[0]?.prompt).toContain('any other details')
    expect(provider.calls[0]?.prompt.toLowerCase()).toContain('do not ask about why')
    expect(provider.calls[0]?.context?.maxTokens).toBe(384)
  })
})

describe('identityWhoKickoffFallback', () => {
  it('names the character and optional background without where/start language', () => {
    const fallback = identityWhoKickoffFallback('Kael', 'Soldier', 'You served in an army.')
    expect(fallback).toContain('Kael')
    expect(fallback).toContain('Soldier')
    expect(fallback.toLowerCase()).toContain('any other details')
    expect(fallback.toLowerCase()).not.toMatch(/where|start|region|oakhollow/)
  })
})

describe('runIdentityInterviewKickoff background context', () => {
  it('includes background label, description, and untrusted story in the system prompt', async () => {
    const provider = createScriptedProvider([JSON.stringify({ dmReply: 'Tell me more.' })])
    await runIdentityInterviewKickoff(
      provider,
      kickoffContext({
        backgroundLabel: 'Soldier',
        backgroundDescription: 'You served in an army.',
        backgroundStory: 'I marched on the northern border.',
        startingGear: [],
        knownSpellNames: []
      })
    )
    const systemPrompt = provider.calls[0]?.context?.systemPrompt ?? ''
    expect(systemPrompt).toContain('Soldier')
    expect(systemPrompt).toContain('You served in an army.')
    expect(systemPrompt).toContain('I marched on the northern border.')
    expect(systemPrompt).not.toContain('Oakhollow')
  })
})

describe('runIdentityInterviewTurn empty foundations', () => {
  it('omits regions, enforces strict order, and focuses next foundation who', async () => {
    const provider = createScriptedProvider([VALID_TURN_RESPONSE])
    const result = await runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'I am Kael.')
    expect(result.foundations.who.complete).toBe(true)
    const systemPrompt = provider.calls[0]?.context?.systemPrompt ?? ''
    expect(systemPrompt).not.toContain('Oakhollow')
    expect(systemPrompt).not.toContain('Blackmire')
    expect(systemPrompt.toLowerCase()).toContain('strict order')
    expect(systemPrompt.toLowerCase()).toContain('ask only')
    expect(provider.calls[0]?.prompt).toContain('Next foundation to interview (focus dmReply here): who')
  })
})

describe('runIdentityInterviewTurn who+why locked', () => {
  it('includes regions and focuses next foundation where', async () => {
    const provider = createScriptedProvider([
      foundationPayload('Which region?', { who: 'Kael', why: 'Justice', where: 'Starts in Oakhollow.' }, 'region-oak')
    ])
    await runIdentityInterviewTurn(
      provider,
      { ...IDENTITY_INTERVIEW_CONTEXT, currentFoundations: whoWhyLocked() },
      'Oakhollow.'
    )
    const systemPrompt = provider.calls[0]?.context?.systemPrompt ?? ''
    expect(systemPrompt).toContain('Oakhollow')
    expect(systemPrompt).toContain('which of these generated regions')
    expect(provider.calls[0]?.prompt).toContain('Next foundation to interview (focus dmReply here): where')
  })
})

describe('runIdentityInterviewTurn order validation', () => {
  it('retries when locking where while why is still incomplete', async () => {
    const provider = createScriptedProvider([
      foundationPayload('Where?', { who: 'Kael', where: 'Oakhollow' }, 'region-oak'),
      foundationPayload('Why?', { who: 'Kael', why: 'Justice' })
    ])
    const result = await runIdentityInterviewTurn(
      provider,
      { ...IDENTITY_INTERVIEW_CONTEXT, currentFoundations: whoLocked() },
      'I seek justice.'
    )
    expect(result.foundations.why.complete).toBe(true)
    expect(result.foundations.where.complete).toBe(false)
    expect(provider.calls).toHaveLength(2)
  })
})

describe('runIdentityInterviewTurn prompt placement', () => {
  it('sends the static identity block via systemPrompt, not the user prompt', async () => {
    const provider = createScriptedProvider([VALID_TURN_RESPONSE])
    await runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'I am Kael.')
    const call = provider.calls[0]!
    expect(call.context?.systemPrompt).toContain('Reclusive forest folk.')
    expect(call.prompt).not.toContain('Reclusive forest folk.')
    expect(call.prompt).not.toContain('abilityScores')
  })

  it('retries with the same systemPrompt on invalid responses', async () => {
    const provider = createScriptedProvider(['not json', VALID_TURN_RESPONSE])
    const result = await runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'Done.')
    expect(result.foundations.who.complete).toBe(true)
    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[1]?.context?.systemPrompt).toBe(provider.calls[0]?.context?.systemPrompt)
  })

  it('throws after exhausting schema retries', async () => {
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])
    await expect(runIdentityInterviewTurn(provider, IDENTITY_INTERVIEW_CONTEXT, 'x')).rejects.toThrow()
    expect(provider.calls).toHaveLength(MAX_SCHEMA_ATTEMPTS)
  })
})

describe('runIdentityInterviewTurn starting region', () => {
  it('accepts startingRegionId when Where locks (who+why already locked)', async () => {
    const provider = createScriptedProvider([
      foundationPayload(
        'Oakhollow it is.',
        { who: 'Kael', why: 'Justice', where: 'Starts in Oakhollow.' },
        'region-oak'
      )
    ])
    const result = await runIdentityInterviewTurn(
      provider,
      { ...IDENTITY_INTERVIEW_CONTEXT, currentFoundations: whoWhyLocked() },
      'Oakhollow.'
    )
    expect(result.startingRegionId).toBe('region-oak')
    expect(result.foundations.where.complete).toBe(true)
  })

  it('retries when Where completes without a valid startingRegionId', async () => {
    const valid = foundationPayload(
      'Oakhollow it is.',
      { who: 'Kael', why: 'Justice', where: 'Starts in Oakhollow.' },
      'region-oak'
    )
    const provider = createScriptedProvider([
      foundationPayload('Somewhere.', { who: 'Kael', why: 'Justice', where: 'A distant land.' }),
      valid
    ])
    const result = await runIdentityInterviewTurn(
      provider,
      { ...IDENTITY_INTERVIEW_CONTEXT, currentFoundations: whoWhyLocked() },
      'Far away.'
    )
    expect(result.startingRegionId).toBe('region-oak')
    expect(provider.calls).toHaveLength(2)
  })
})

describe('runIdentityInterviewTurn transcript windowing size', () => {
  it('includes at most the last 5 transcript turns in the prompt', async () => {
    const provider = createScriptedProvider([
      foundationPayload('Why?', { who: 'Kael, sworn knight of the drowned court.', why: 'Justice' })
    ])
    const context = {
      ...IDENTITY_INTERVIEW_CONTEXT,
      transcript: buildTranscript(10, 'early'),
      currentFoundations: whoLocked('Kael, sworn knight of the drowned court.')
    }
    await runIdentityInterviewTurn(provider, context, 'Latest.')
    const prompt = provider.calls[0]?.prompt ?? ''
    expect(prompt).not.toContain('early turn 1')
    expect(prompt).toContain('late turn 6')
    expect(prompt).toContain('late turn 10')
  })

  it('produces an identical prompt regardless of aged-out early content', async () => {
    const response = foundationPayload('Why?', { who: 'Kael' })
    const shortEarly = createScriptedProvider([response])
    const longEarly = createScriptedProvider([response])
    const currentFoundations = whoLocked()
    await runIdentityInterviewTurn(
      shortEarly,
      { ...IDENTITY_INTERVIEW_CONTEXT, transcript: buildTranscript(10, 'x'), currentFoundations },
      'Latest.'
    )
    await runIdentityInterviewTurn(
      longEarly,
      {
        ...IDENTITY_INTERVIEW_CONTEXT,
        transcript: buildTranscript(10, 'a much longer early exchange about lineage '.repeat(20)),
        currentFoundations
      },
      'Latest.'
    )
    expect(shortEarly.calls[0]?.prompt).toBe(longEarly.calls[0]?.prompt)
  })
})

describe('runIdentityInterviewTurn transcript locked summaries', () => {
  it('keeps locked foundation summaries when their turns aged out', async () => {
    const provider = createScriptedProvider([
      foundationPayload('Why?', {
        who: 'Kael, sworn knight of the drowned court.',
        why: 'Justice'
      })
    ])
    await runIdentityInterviewTurn(
      provider,
      {
        ...IDENTITY_INTERVIEW_CONTEXT,
        transcript: buildTranscript(10, 'early'),
        currentFoundations: whoLocked('Kael, sworn knight of the drowned court.')
      },
      'Latest.'
    )
    expect(provider.calls[0]?.prompt).toContain('Kael, sworn knight of the drowned court.')
  })

  it('accepts re-emitting already-locked who while newly locking why', async () => {
    const provider = createScriptedProvider([
      foundationPayload('Why?', { who: 'Different who re-emit', why: 'Justice' })
    ])
    const result = await runIdentityInterviewTurn(
      provider,
      { ...IDENTITY_INTERVIEW_CONTEXT, currentFoundations: whoLocked('Kael, original') },
      'I seek justice.'
    )
    expect(result.foundations.why.complete).toBe(true)
  })
})

describe('nextIncompleteFoundation', () => {
  it('walks who → why → where → what then null', () => {
    const status = defaultIdentityFoundations()
    expect(nextIncompleteFoundation(status)).toBe('who')
    status.who = { complete: true, summary: 'Kael' }
    expect(nextIncompleteFoundation(status)).toBe('why')
    status.why = { complete: true, summary: 'Justice' }
    expect(nextIncompleteFoundation(status)).toBe('where')
    status.where = { complete: true, summary: 'Oakhollow' }
    expect(nextIncompleteFoundation(status)).toBe('what')
    status.what = { complete: true, summary: 'Guarding the gate' }
    expect(nextIncompleteFoundation(status)).toBeNull()
  })
})

describe('foundationsAdvanceInOrder', () => {
  it('rejects where-before-why and accepts locking next only', () => {
    const current = whoLocked()
    expect(
      foundationsAdvanceInOrder(current, {
        ...defaultIdentityFoundations(),
        who: { complete: true, summary: 'Kael' },
        where: { complete: true, summary: 'Oakhollow' }
      })
    ).toBe(false)
    expect(
      foundationsAdvanceInOrder(current, {
        ...defaultIdentityFoundations(),
        who: { complete: true, summary: 'Kael' },
        why: { complete: true, summary: 'Justice' }
      })
    ).toBe(true)
    expect(
      foundationsAdvanceInOrder(current, {
        ...defaultIdentityFoundations(),
        who: { complete: true, summary: 'Kael' },
        why: { complete: true, summary: 'Justice' },
        where: { complete: true, summary: 'Oakhollow' }
      })
    ).toBe(false)
  })
})

describe('mergeFoundationStatus', () => {
  it('merges newly completed foundations without dropping prior summaries', () => {
    const current = whoLocked()
    const merged = mergeFoundationStatus(current, {
      ...defaultIdentityFoundations(),
      why: { complete: true, summary: 'Justice' }
    })
    expect(merged.who.summary).toBe('Kael')
    expect(merged.why.summary).toBe('Justice')
    expect(allFoundationsComplete(merged)).toBe(false)
  })

  it('keeps the first locked summary when the model re-emits a different one', () => {
    const current = whoLocked('Kael, a wandering knight with a detailed past.')
    const merged = mergeFoundationStatus(current, {
      ...defaultIdentityFoundations(),
      who: { complete: true, summary: 'Kael.' }
    })
    expect(merged.who).toEqual({
      complete: true,
      summary: 'Kael, a wandering knight with a detailed past.'
    })
  })
})
