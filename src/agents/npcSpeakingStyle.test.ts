import { describe, expect, it } from 'vitest'
import {
  buildNpcSpeakingStylePrompt,
  generateNpcSpeakingStyle,
  type NpcSpeakingStyleIdentity
} from './npcSpeakingStyle'
import { CampaignGenerationSchemaError, MAX_GENERATION_ATTEMPTS } from './campaignGeneration/types'
import { createScriptedProvider } from './providers/mockHarness'

const BASE_IDENTITY: NpcSpeakingStyleIdentity = {
  name: 'Mara',
  role: 'tavern keeper',
  disposition: 'friendly',
  temperament: 'cheerful',
  alignment: 'neutral_good',
  raceKey: 'human',
  genderKey: 'female',
  classKey: 'commoner',
  backgroundKey: 'innkeeper',
  backstory: 'Mara inherited the tavern from her uncle.'
}

const VALID_TWO_EXAMPLES = {
  specimen:
    "I keep the mugs full and the gossip fresher. People yap, I listen — that's the job, innit?",
  examples: ['Two ales and shut the door on your way out.', "You're staring. Buy something or ask nicely."]
}

const VALID_THREE_EXAMPLES = {
  specimen: "Look, I don't run a charity. Coins on the bar or you're in the rain.",
  examples: ['Ale or water?', 'We close when I say we close.', "Don't touch the good bottle."]
}

describe('buildNpcSpeakingStylePrompt', () => {
  it('instructs JSON specimen + 2–3 examples', () => {
    const prompt = buildNpcSpeakingStylePrompt(BASE_IDENTITY)
    expect(prompt).toContain('{"specimen":string,"examples":[string,string]|[string,string,string]}')
    expect(prompt).toMatch(/first-person/i)
  })

  it('requires person-sounding voice and forbids quest-giver templates and purple monologue', () => {
    const prompt = buildNpcSpeakingStylePrompt(BASE_IDENTITY)
    expect(prompt.toLowerCase()).toMatch(/person-sounding|real person/)
    expect(prompt.toLowerCase()).toMatch(/contraction/)
    expect(prompt.toLowerCase()).toMatch(/natural rhythm/)
    expect(prompt.toLowerCase()).toMatch(/quest-giver/)
    expect(prompt.toLowerCase()).toMatch(/purple/)
    expect(prompt.toLowerCase()).toMatch(/monologue/)
  })

  it('documents soft length budget for specimen and examples', () => {
    const prompt = buildNpcSpeakingStylePrompt(BASE_IDENTITY)
    expect(prompt).toMatch(/~?400/)
    expect(prompt).toMatch(/~?160/)
  })

  it('grounds original NPCs only in supplied identity fields', () => {
    const prompt = buildNpcSpeakingStylePrompt(BASE_IDENTITY)
    expect(prompt).toMatch(/ground.*identity|identity fields/i)
    expect(prompt).not.toMatch(/match.*recognizable speech/i)
    expect(prompt).toContain('Mara')
    expect(prompt).toContain('tavern keeper')
    expect(prompt).toContain(BASE_IDENTITY.backstory!)
  })

  it('instructs fandom-faithful voice when fandomCharacterHint is present', () => {
    const prompt = buildNpcSpeakingStylePrompt({
      ...BASE_IDENTITY,
      name: 'Raphtalia',
      settingLabel: 'The Rising of the Shield Hero',
      fandomCharacterHint: 'Raphtalia'
    })
    expect(prompt).toContain('Raphtalia')
    expect(prompt).toContain('The Rising of the Shield Hero')
    expect(prompt.toLowerCase()).toMatch(/recognizable speech|fandom|source material/)
    expect(prompt.toLowerCase()).toMatch(/match.*character|faithful/i)
  })
})

describe('generateNpcSpeakingStyle — valid parse', () => {
  it('parses valid JSON with two examples', async () => {
    const provider = createScriptedProvider([JSON.stringify(VALID_TWO_EXAMPLES)])
    const sample = await generateNpcSpeakingStyle(provider, BASE_IDENTITY)
    expect(sample.specimen).toBe(VALID_TWO_EXAMPLES.specimen)
    expect(sample.examples).toHaveLength(2)
    expect(provider.calls).toHaveLength(1)
  })

  it('parses valid JSON with three examples', async () => {
    const provider = createScriptedProvider([JSON.stringify(VALID_THREE_EXAMPLES)])
    const sample = await generateNpcSpeakingStyle(provider, BASE_IDENTITY)
    expect(sample.examples).toHaveLength(3)
  })
})

describe('generateNpcSpeakingStyle — retries', () => {
  it('retries malformed output until schema validates', async () => {
    const provider = createScriptedProvider(['not json', JSON.stringify(VALID_TWO_EXAMPLES)])
    const sample = await generateNpcSpeakingStyle(provider, BASE_IDENTITY)
    expect(sample.specimen).toBe(VALID_TWO_EXAMPLES.specimen)
    expect(provider.calls).toHaveLength(2)
  })

  it('retries when examples array has zero entries', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ specimen: 'I talk fine.', examples: [] }),
      JSON.stringify(VALID_TWO_EXAMPLES)
    ])
    const sample = await generateNpcSpeakingStyle(provider, BASE_IDENTITY)
    expect(sample.examples).toHaveLength(2)
    expect(provider.calls).toHaveLength(2)
  })

  it('retries when examples array has one entry', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ specimen: 'I talk fine.', examples: ['Only one line.'] }),
      JSON.stringify(VALID_TWO_EXAMPLES)
    ])
    const sample = await generateNpcSpeakingStyle(provider, BASE_IDENTITY)
    expect(sample.examples).toHaveLength(2)
    expect(provider.calls).toHaveLength(2)
  })

  it('retries when examples array has four or more entries', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        specimen: 'I talk fine.',
        examples: ['One.', 'Two.', 'Three.', 'Four.']
      }),
      JSON.stringify(VALID_TWO_EXAMPLES)
    ])
    const sample = await generateNpcSpeakingStyle(provider, BASE_IDENTITY)
    expect(sample.examples).toHaveLength(2)
    expect(provider.calls).toHaveLength(2)
  })

  it('retries when specimen is empty', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ specimen: '   ', examples: ['A line.', 'Another line.'] }),
      JSON.stringify(VALID_TWO_EXAMPLES)
    ])
    const sample = await generateNpcSpeakingStyle(provider, BASE_IDENTITY)
    expect(sample.specimen).toBe(VALID_TWO_EXAMPLES.specimen)
    expect(provider.calls).toHaveLength(2)
  })
})

describe('generateNpcSpeakingStyle — exhausted retries', () => {
  it('throws CampaignGenerationSchemaError after exhausting retries', async () => {
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])
    await expect(generateNpcSpeakingStyle(provider, BASE_IDENTITY)).rejects.toBeInstanceOf(
      CampaignGenerationSchemaError
    )
    expect(provider.calls).toHaveLength(MAX_GENERATION_ATTEMPTS)
  })
})
