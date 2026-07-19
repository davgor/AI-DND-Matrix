import { describe, expect, it } from 'vitest'
import {
  filterDmExpositionEntries,
  filterSocialEntries,
  pickSceneSummary
} from './sceneContext'

const ENTRIES = [
  { id: '1', timestamp: 't1', speaker: 'player' as const, text: 'I enter the tavern.' },
  { id: '2', timestamp: 't2', speaker: 'dm' as const, text: 'Smoke hangs in the rafters.' },
  {
    id: '3',
    timestamp: 't3',
    speaker: 'npc' as const,
    text: 'Welcome, traveler.',
    reactionKind: 'dialogue' as const,
    speakerName: 'Barkeep'
  },
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
  it('keeps only DM lines in scene and routes player + NPC dialogue to social', () => {
    expect(filterDmExpositionEntries(ENTRIES).map((e) => e.id)).toEqual(['2', '4'])
    expect(filterSocialEntries(ENTRIES).map((e) => e.id)).toEqual(['1', '3'])
  })

  it('keeps Scene DM-only without player actionExpression restatements', () => {
    const entries = mixedSceneSocialEntries()
    expect(filterDmExpositionEntries(entries).map((e) => e.id)).toEqual(['3'])
    expect(filterDmExpositionEntries(entries).every((e) => e.speaker === 'dm')).toBe(true)
    expect(filterSocialEntries(entries).some((e) => e.playerLineKind === 'actionExpression')).toBe(false)
  })

  it('routes player raw + NPC/party lines to Social, including NPC actions', () => {
    const entries = mixedSceneSocialEntries()
    expect(filterSocialEntries(entries).map((e) => e.id)).toEqual(['1', '4', '5', '6'])
    expect(filterSocialEntries(entries)[0]?.text).toBe('I draw my sword')
  })
})

function mixedSceneSocialEntries() {
  return [
    { id: '1', timestamp: 't1', speaker: 'player' as const, text: 'I draw my sword', playerLineKind: 'raw' as const },
    {
      id: '2',
      timestamp: 't2',
      speaker: 'player' as const,
      text: 'Kael draws his sword.',
      playerLineKind: 'actionExpression' as const
    },
    {
      id: '2b',
      timestamp: 't2b',
      speaker: 'player' as const,
      text: "David says, 'Sorry I'm just a bit lost.'",
      playerLineKind: 'actionExpression' as const
    },
    { id: '3', timestamp: 't3', speaker: 'dm' as const, text: 'Steel flashes.' },
    {
      id: '4',
      timestamp: 't4',
      speaker: 'npc' as const,
      text: 'Stand down!',
      reactionKind: 'dialogue' as const,
      speakerName: 'Guard'
    },
    {
      id: '5',
      timestamp: 't5',
      speaker: 'npc' as const,
      text: 'The wolf lunges.',
      reactionKind: 'action' as const,
      speakerName: 'Wolf'
    },
    {
      id: '6',
      timestamp: 't6',
      speaker: 'partyMember' as const,
      text: 'I have your back.',
      speakerName: 'Ally'
    }
  ]
}
