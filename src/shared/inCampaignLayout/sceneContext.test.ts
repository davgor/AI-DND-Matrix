import { describe, expect, it } from 'vitest'
import {
  filterDmExpositionEntries,
  filterPlayerInteractionEntries,
  pickSceneSummary
} from './sceneContext'

const ENTRIES = [
  { id: '1', timestamp: 't1', speaker: 'player' as const, text: 'I enter the tavern.' },
  { id: '2', timestamp: 't2', speaker: 'dm' as const, text: 'Smoke hangs in the rafters.' },
  { id: '3', timestamp: 't3', speaker: 'npc' as const, text: 'Welcome, traveler.' },
  {
    id: '4',
    timestamp: 't4',
    speaker: 'dm' as const,
    text: 'The barkeep slides a mug forward.',
    sceneSetting: true
  }
]

describe('pickSceneSummary', () => {
  it('prefers the latest scene-setting DM line over region blurb', () => {
    expect(
      pickSceneSummary(ENTRIES, {
        regionName: 'Oakhollow',
        regionBlurb: 'A quiet logging village.'
      })
    ).toBe('The barkeep slides a mug forward.')
  })

  it('falls back to region blurb when no scene-setting DM line exists', () => {
    const withoutSceneSetting = ENTRIES.filter((entry) => !entry.sceneSetting)
    expect(
      pickSceneSummary(withoutSceneSetting, {
        regionName: 'Oakhollow',
        regionBlurb: 'A quiet logging village.'
      })
    ).toBe('A quiet logging village.')
  })

  it('uses quiet empty state with region name when no blurb or scene setting', () => {
    expect(pickSceneSummary([], { regionName: 'Oakhollow' })).toBe('The scene is quiet in Oakhollow…')
  })

  it('uses generic quiet empty state when region is unknown', () => {
    expect(pickSceneSummary([])).toBe('The scene is quiet…')
  })

  it('does not use latest DM narration when it is not scene-setting', () => {
    const entries = [
      { id: '1', timestamp: 't1', speaker: 'dm' as const, text: 'Rain drums on stone.' },
      { id: '2', timestamp: 't2', speaker: 'dm' as const, text: 'A shadow moves.' }
    ]
    expect(pickSceneSummary(entries, { regionBlurb: 'Misty crossroads.' })).toBe('Misty crossroads.')
  })
})

describe('scene feed filters', () => {
  it('splits exposition and player interaction feeds', () => {
    expect(filterDmExpositionEntries(ENTRIES)).toHaveLength(3)
    expect(filterPlayerInteractionEntries(ENTRIES)).toHaveLength(1)
  })

  it('includes player action expression in exposition and keeps raw input in player feed', () => {
    const entries = [
      { id: '1', timestamp: 't1', speaker: 'player' as const, text: 'I draw my sword', playerLineKind: 'raw' as const },
      {
        id: '2',
        timestamp: 't2',
        speaker: 'player' as const,
        text: 'Kael draws his sword.',
        playerLineKind: 'actionExpression' as const
      },
      { id: '3', timestamp: 't3', speaker: 'dm' as const, text: 'Steel flashes.' }
    ]
    expect(filterDmExpositionEntries(entries)).toHaveLength(2)
    expect(filterPlayerInteractionEntries(entries)).toHaveLength(1)
    expect(filterPlayerInteractionEntries(entries)[0]?.text).toBe('I draw my sword')
  })
})
