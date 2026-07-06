import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../providers/mockHarness'
import { countParagraphs, padWorldProse } from './normalize'
import { buildWorldSummaryFromHistoryPrompt, generateWorldSummaryFromHistory } from './worldSummaryRegen'

describe('buildWorldSummaryFromHistoryPrompt', () => {
  it('asks for a three-paragraph hook summary from established history', () => {
    const prompt = buildWorldSummaryFromHistoryPrompt({
      premisePrompt: 'A haunted marsh',
      worldName: 'Tyria',
      worldHistory: 'Epoch one.\n\nEpoch two.\n\nEpoch three.\n\nEpoch four.\n\nEpoch five.'
    })
    expect(prompt).toContain('Tyria')
    expect(prompt).toContain('science fiction')
    expect(prompt).toContain('at least two full sentences')
    expect(prompt).toContain('worldSummary')
  })
})

describe('generateWorldSummaryFromHistory', () => {
  it('returns a normalized three-paragraph summary', async () => {
    const summary =
      'Hook one.\n\nHook two.\n\nHook three.'
    const provider = createScriptedProvider([JSON.stringify({ worldSummary: summary })])
    const result = await generateWorldSummaryFromHistory(provider, {
      premisePrompt: 'A haunted marsh',
      worldName: 'Tyria',
      worldHistory: padWorldProse('Deep past.', 5)
    })
    expect(countParagraphs(result)).toBeGreaterThanOrEqual(3)
    expect(result).toContain('Hook one')
  })
})
