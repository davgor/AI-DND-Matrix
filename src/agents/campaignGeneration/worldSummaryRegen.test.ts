import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../providers/mockHarness'
import { countParagraphs } from './normalize'
import { buildWorldSummaryFromHistoryPrompt, generateWorldSummaryFromHistory } from './worldSummaryRegen'
import { VALID_WORLD } from './fixtures'

const VALID_SUMMARY =
  'River towns still pay twin tolls to guild barges and temple courts. Ferry crews know which captains smuggle refugees after harvest failures.\n\nMercenary companies winter in the hill forts they once besieged, selling escorts to caravans that cannot trust the high roads. Every contract names a different villain, but the same muddy passes.\n\nStorm priests claim the barrow lights are warnings, not invitations. Locals hire outsiders anyway because the granaries are half empty.'

describe('buildWorldSummaryFromHistoryPrompt', () => {
  it('asks for a three-paragraph hook summary from established history', () => {
    const prompt = buildWorldSummaryFromHistoryPrompt({
      premisePrompt: 'A haunted marsh',
      worldName: 'Tyria',
      worldHistory: VALID_WORLD.worldHistory
    })
    expect(prompt).toContain('Tyria')
    expect(prompt).toContain('science fiction')
    expect(prompt).toContain('at least two full sentences')
    expect(prompt).toContain('worldSummary')
    expect(prompt).toContain('hearths')
  })
})

describe('generateWorldSummaryFromHistory', () => {
  it('returns a validated three-paragraph summary without filler padding', async () => {
    const provider = createScriptedProvider([JSON.stringify({ worldSummary: VALID_SUMMARY })])
    const result = await generateWorldSummaryFromHistory(provider, {
      premisePrompt: 'A haunted marsh',
      worldName: 'Tyria',
      worldHistory: VALID_WORLD.worldHistory
    })
    expect(countParagraphs(result)).toBe(3)
    expect(result).toContain('River towns')
    expect(result).not.toContain('Travelers still tell the tale')
  })
})
