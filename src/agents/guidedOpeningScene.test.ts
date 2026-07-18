import { describe, expect, it } from 'vitest'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import { runOpeningSceneKickoff, runOpeningSceneTurn } from './guidedOpeningScene'
import { createScriptedProvider } from './providers/mockHarness'

const context = {
  campaignPremise: 'A flooded kingdom.',
  identity: {
    identityWho: 'Kael, a wandering knight.',
    identityWhy: 'To find the sunken crown.',
    identityWhere: 'Oakhollow village.',
    identityWhat: 'A steadfast fighter.',
    abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
    raceName: 'Elf',
    raceLore: {
      summary: 'Reclusive forest folk.',
      appearance: 'Slender.',
      culture: 'Old groves.',
      roleInThisLand: 'Keepers.',
      hooks: ['A dying grove.']
    },
    backgroundLabel: 'Soldier',
    backgroundDescription: 'You served in an army.',
    backgroundStory: 'Years on the march.'
  },
  regions: [{ name: 'Oakhollow', description: 'A logging village.' }],
  npcs: [{ name: 'Mira', role: 'shopkeeper', disposition: 'friendly' }],
  storyThread: { title: 'The Crown', state: 'starting', summary: 'A throne lies hidden.' },
  transcript: [],
  currentOpeningScene: null
}

describe('runOpeningSceneKickoff', () => {
  it('proposes a scene and asks the player to confirm before they speak', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'You wake in Oakhollow under a dripping eaves. Does this look good to you?',
        proposedOpeningScene: 'You wake in Oakhollow under a dripping eaves.',
        sceneReady: false
      })
    ])
    const result = await runOpeningSceneKickoff(provider, context)
    expect(result.sceneReady).toBe(false)
    expect(result.proposedOpeningScene).toContain('Oakhollow')
    expect(result.dmReply.toLowerCase()).toContain('look good')
    const prompt = [provider.calls[0]?.context?.systemPrompt, provider.calls[0]?.prompt].join('\n')
    expect(prompt).toContain('Does this look good to you')
    expect(prompt).toContain('player has not spoken yet')
    expect(prompt).toContain('Kael')
  })

  it('retries invalid schema responses', async () => {
    const provider = createScriptedProvider([
      'oops',
      JSON.stringify({
        dmReply: 'Start at the dock. Does this look good to you?',
        proposedOpeningScene: 'Mist hugs the dock.',
        sceneReady: false
      })
    ])
    const result = await runOpeningSceneKickoff(provider, context)
    expect(result.dmReply).toContain('dock')
    expect(provider.calls).toHaveLength(2)
  })
})

describe('runOpeningSceneTurn', () => {
  it('returns scene-not-ready negotiation replies', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'How about starting in the tavern?',
        proposedOpeningScene: 'You push open the tavern door.',
        sceneReady: false
      })
    ])
    const result = await runOpeningSceneTurn(provider, context, 'Something cozy.')
    expect(result.sceneReady).toBe(false)
    expect(result.proposedOpeningScene).toContain('tavern')
    expect(provider.calls[0]?.prompt).toContain('Kael')
    expect(provider.calls[0]?.prompt).toContain('Elf')
    expect(provider.calls[0]?.prompt).toContain('Soldier')
    expect(provider.calls[0]?.prompt).toContain('Years on the march.')
    expect(provider.calls[0]?.context?.maxTokens).toBe(768)
    const prompt = provider.calls[0]?.prompt ?? ''
    expect(prompt).toContain('Does this look good to you')
    expect(prompt).toMatch(/confirm|sceneReady true/i)
    expect(prompt).toMatch(/decline|revise|negotiate/i)
    expect(prompt).toMatch(/proposedOpeningScene/i)
    expect(prompt).toMatch(/do not (begin|start) (in-play|play) narration/i)
    expect(prompt).toMatch(/ability scores|abilityScores/i)
    expect(prompt).toMatch(/never recite score numbers/i)
    expect(prompt).toContain('14')
  })

  it('returns scene-ready when converged', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        dmReply: 'Perfect — we begin there.',
        proposedOpeningScene: 'Rain drums on the tavern roof.',
        sceneReady: true
      })
    ])
    const result = await runOpeningSceneTurn(provider, context, 'Yes, start there.')
    expect(result.sceneReady).toBe(true)
  })

  it('retries invalid schema responses', async () => {
    const provider = createScriptedProvider(['oops', '{"dmReply":"ok","proposedOpeningScene":null,"sceneReady":false}'])
    const result = await runOpeningSceneTurn(provider, context, 'hi')
    expect(result.dmReply).toBe('ok')
    expect(provider.calls).toHaveLength(2)
  })

  it('throws after exhausting retries', async () => {
    const provider = createScriptedProvider(['x', 'y', 'z'])
    await expect(runOpeningSceneTurn(provider, context, 'hi')).rejects.toThrow()
    expect(provider.calls).toHaveLength(MAX_SCHEMA_ATTEMPTS)
  })
})
