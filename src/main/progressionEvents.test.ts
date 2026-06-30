import { describe, expect, it } from 'vitest'
import { xpAwardedEntries, perkChosenEntries } from './progressionEvents.testHelpers'

describe('progression event payloads', () => {
  it('xp_awarded event includes narration and amount fields', () => {
    const event = {
      id: 'e1',
      campaignId: 'c1',
      timestamp: new Date().toISOString(),
      type: 'xp_awarded',
      payload: {
        source: 'encounter_end',
        amount: 45,
        clamped: false,
        newXpTotal: 345,
        narrationText: 'The fight taught you plenty.'
      }
    }
    const entries = xpAwardedEntries(event)
    expect(entries[0]?.text).toContain('fight taught')
  })

  it('perk_chosen event includes category and summary', () => {
    const event = {
      id: 'e2',
      campaignId: 'c1',
      timestamp: new Date().toISOString(),
      type: 'perk_chosen',
      payload: {
        characterId: 'hero',
        perkId: 'a',
        category: 'spell_access',
        level: 2,
        mechanicalSummary: 'Knows spell: firebolt'
      }
    }
    const entries = perkChosenEntries(event)
    expect(entries[0]?.text).toContain('firebolt')
  })
})
