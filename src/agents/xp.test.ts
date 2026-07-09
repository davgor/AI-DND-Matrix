import { describe, expect, it } from 'vitest'
import { buildXpPrompt, resolveXpAward } from './xp'
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

describe('resolveXpAward', () => {
  it('clamps agent amount above max', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ narrationText: 'Big reward.', xpAmount: 9999 })
    ])
    const result = await resolveXpAward(provider, questContext, { min: 20, max: 60, suggested: 40 })
    expect(result.xpAmount).toBe(60)
  })

  it('skips when budget max is zero — caller responsibility', () => {
    const prompt = buildXpPrompt(questContext, { min: 0, max: 0, suggested: 0 })
    expect(prompt).toContain('min: 0')
  })

  it('quest complete awards XP in band via scripted provider', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ narrationText: 'Well done.', xpAmount: 45 })
    ])
    const result = await resolveXpAward(provider, questContext, { min: 20, max: 60, suggested: 40 })
    expect(result.xpAmount).toBe(45)
    expect(result.narrationText).toContain('Well done')
  })

  it('moves the XP schema into systemPrompt — user prompt keeps source and budget (040.9)', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ narrationText: 'Well earned.', xpAmount: 40 })
    ])

    await resolveXpAward(provider, questContext, { min: 20, max: 60, suggested: 40 })

    const call = provider.calls[0]!
    expect(call.prompt).toContain('Deliver grain.')
    expect(call.prompt).toContain('min: 20')
    expect(call.prompt).not.toContain('Respond ONLY with JSON')
    expect(call.prompt).not.toContain('Propose xpAmount')
    const system = call.context?.systemPrompt ?? ''
    expect(system).toContain('Respond ONLY with JSON: {"narrationText":string,"xpAmount":number}')
    expect(system).toContain('Propose xpAmount within the budget')
    expect(system).toContain('no markdown fences')
  })

  it('passes the identical GenerateContext object on every retry attempt (data-integrity item 11)', async () => {
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])

    await resolveXpAward(provider, questContext, { min: 20, max: 60, suggested: 40 })

    expect(provider.calls).toHaveLength(3)
    const firstContext = provider.calls[0]?.context
    expect(firstContext?.systemPrompt).toBeTruthy()
    for (const call of provider.calls) {
      expect(call.context).toBe(firstContext)
    }
  })
})
