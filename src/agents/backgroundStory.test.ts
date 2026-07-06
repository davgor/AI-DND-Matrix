import { describe, expect, it } from 'vitest'
import { MAX_GENERATION_ATTEMPTS } from './campaignGeneration/types'
import {
  buildBackgroundStoryPrompt,
  generateBackgroundStory,
  type BackgroundStoryInput
} from './backgroundStory'
import { createScriptedProvider } from './providers/mockHarness'
import type { RaceLore } from '../shared/raceSelection/types'

const RACE_LORE: RaceLore = {
  summary: 'Humans are traders here.',
  appearance: 'Sun-browned.',
  culture: 'Mercantile.',
  roleInThisLand: 'Bridge-builders.',
  hooks: ['A caravan arrives.']
}

function baseInput(overrides: Partial<BackgroundStoryInput> = {}): BackgroundStoryInput {
  return {
    characterName: 'Mira',
    archetype: 'fighter',
    abilityScores: { body: 16, agility: 12, mind: 10, presence: 10 },
    raceLabel: 'Human',
    raceLore: RACE_LORE,
    campaignPremise: 'A flooded kingdom.',
    worldSummary: 'Storms have worsened.',
    backgroundLabel: 'Soldier',
    backgroundDescription: 'You served in an army.',
    playerPrompt: null,
    existingStory: null,
    ...overrides
  }
}

describe('buildBackgroundStoryPrompt', () => {
  it('asks for about two paragraphs of narrative prose', () => {
    const prompt = buildBackgroundStoryPrompt(baseInput())
    expect(prompt.toLowerCase()).toMatch(/two paragraph/)
  })

  it('includes player guidance when provided', () => {
    const prompt = buildBackgroundStoryPrompt(baseInput({ playerPrompt: 'Mention my old captain.' }))
    expect(prompt).toContain('Mention my old captain.')
    expect(prompt).toContain('player')
  })

  it('still builds a complete prompt without player guidance', () => {
    const prompt = buildBackgroundStoryPrompt(baseInput({ playerPrompt: null }))
    expect(prompt).toContain('Soldier')
    expect(prompt).not.toContain('placeholder')
  })

  it('omits race lore block when race lore is null', () => {
    const prompt = buildBackgroundStoryPrompt(baseInput({ raceLabel: null, raceLore: null }))
    expect(prompt).not.toContain('roleInThisLand')
  })

  it('frames untrusted narrative fields with guardrail language', () => {
    const prompt = buildBackgroundStoryPrompt(
      baseInput({
        playerPrompt: 'Focus on desert marches.',
        existingStory: 'Draft about the barracks.'
      })
    )
    expect(prompt).toContain('untrusted narrative content')
    expect(prompt).toContain('A flooded kingdom.')
    expect(prompt).toContain('Draft about the barracks.')
    expect(prompt).toContain('Focus on desert marches.')
    expect(prompt).toContain('no mechanics')
  })
})

describe('generateBackgroundStory', () => {
  it('returns trimmed prose and retries empty output', async () => {
    const provider = createScriptedProvider(['   ', '  A veteran of border skirmishes.  '])
    const story = await generateBackgroundStory(provider, baseInput())
    expect(story).toBe('A veteran of border skirmishes.')
    expect(provider.calls).toHaveLength(2)
  })

  it('retries up to MAX_GENERATION_ATTEMPTS then throws', async () => {
    const provider = createScriptedProvider(['', '', ''])
    await expect(generateBackgroundStory(provider, baseInput())).rejects.toThrow()
    expect(provider.calls).toHaveLength(MAX_GENERATION_ATTEMPTS)
  })
})
