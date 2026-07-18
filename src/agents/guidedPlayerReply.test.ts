import { describe, expect, it } from 'vitest'
import { MAX_GENERATION_ATTEMPTS } from './campaignGeneration/types'
import {
  buildGuidedPlayerReplyPrompt,
  generateGuidedPlayerReply,
  type GuidedPlayerReplyInput
} from './guidedPlayerReply'
import { createScriptedProvider } from './providers/mockHarness'
import type { RaceLore } from '../shared/raceSelection/types'

const RACE_LORE: RaceLore = {
  summary: 'Humans are traders here.',
  appearance: 'Sun-browned.',
  culture: 'Mercantile.',
  roleInThisLand: 'Bridge-builders.',
  hooks: ['A caravan arrives.']
}

function baseInput(overrides: Partial<GuidedPlayerReplyInput> = {}): GuidedPlayerReplyInput {
  return {
    phase: 'identity',
    campaignPremise: 'A haunted marsh.',
    characterName: 'Kael',
    characterClass: 'fighter',
    abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
    alignment: 'lawful_good',
    raceName: 'Human',
    raceLore: RACE_LORE,
    backgroundLabel: 'Soldier',
    backgroundDescription: 'You served in an army.',
    backgroundStory: 'I left the garrison after the flood.',
    foundations: {
      who: { complete: false },
      why: { complete: false },
      where: { complete: false },
      what: { complete: false }
    },
    identityWho: null,
    identityWhy: null,
    identityWhere: null,
    identityWhat: null,
    regions: [{ id: 'r1', name: 'Oakhollow', description: 'A village.' }],
    npcs: [],
    storyThread: null,
    currentOpeningScene: null,
    transcript: [
      { role: 'dm', content: 'Who are you, beyond the name on your sheet?' }
    ],
    existingDraft: null,
    ...overrides
  }
}

describe('buildGuidedPlayerReplyPrompt', () => {
  it('asks for a first-person player reply to the latest DM question', () => {
    const prompt = buildGuidedPlayerReplyPrompt(baseInput())
    expect(prompt.toLowerCase()).toMatch(/first[- ]person/)
    expect(prompt).toContain('Who are you, beyond the name on your sheet?')
    expect(prompt).toContain('player reply')
  })

  it('includes character facts and conversation context', () => {
    const prompt = buildGuidedPlayerReplyPrompt(baseInput())
    expect(prompt).toContain('Kael')
    expect(prompt).toContain('fighter')
    expect(prompt).toContain('Soldier')
    expect(prompt).toContain('A haunted marsh.')
    expect(prompt).toContain('I left the garrison after the flood.')
    expect(prompt).toContain('untrusted narrative content')
  })

  it('includes an existing draft when revising', () => {
    const prompt = buildGuidedPlayerReplyPrompt(
      baseInput({ existingDraft: 'I am a quiet knight.' })
    )
    expect(prompt).toContain('I am a quiet knight.')
  })

  it('includes locked identity foundations for opening-scene phase', () => {
    const prompt = buildGuidedPlayerReplyPrompt(
      baseInput({
        phase: 'opening_scene',
        identityWho: 'Kael, a marsh knight.',
        identityWhy: 'Seeking the source of the floods.',
        identityWhere: 'Starts in Oakhollow.',
        identityWhat: 'A loyal blade.',
        transcript: [{ role: 'dm', content: 'Where should we begin?' }],
        npcs: [{ name: 'Mira', role: 'innkeeper', disposition: 'warm' }],
        storyThread: { title: 'Floods', state: 'starting', summary: 'Waters rise.' }
      })
    )
    expect(prompt).toContain('Kael, a marsh knight.')
    expect(prompt).toContain('Where should we begin?')
    expect(prompt).toContain('Mira')
    expect(prompt).toContain('Floods')
  })
})

describe('generateGuidedPlayerReply', () => {
  it('returns trimmed prose and retries empty output', async () => {
    const provider = createScriptedProvider(['   ', '  I am Kael of Oakhollow.  '])
    const reply = await generateGuidedPlayerReply(provider, baseInput())
    expect(reply).toBe('I am Kael of Oakhollow.')
    expect(provider.calls).toHaveLength(2)
  })

  it('caps tokens for a short conversational reply', async () => {
    const provider = createScriptedProvider(['I am Kael.'])
    await generateGuidedPlayerReply(provider, baseInput())
    expect(provider.calls[0]?.context?.maxTokens).toBe(512)
  })

  it('retries up to MAX_GENERATION_ATTEMPTS then throws', async () => {
    const provider = createScriptedProvider(['', '', ''])
    await expect(generateGuidedPlayerReply(provider, baseInput())).rejects.toThrow()
    expect(provider.calls).toHaveLength(MAX_GENERATION_ATTEMPTS)
  })
})
