import { describe, expect, it } from 'vitest'
import {
  filterConversationEntries,
  filterDmFlavorEntries,
  pickCurrentSceneText
} from './sceneContext'

const ENTRIES = [
  { id: '1', timestamp: 't1', speaker: 'player' as const, text: 'I enter the tavern.', playerLineKind: 'raw' as const },
  {
    id: '2',
    timestamp: 't2',
    speaker: 'dm' as const,
    text: 'Smoke hangs in the rafters.',
    dmLineKind: 'scene' as const
  },
  { id: '3', timestamp: 't3', speaker: 'npc' as const, text: 'Welcome, traveler.' },
  {
    id: '4',
    timestamp: 't4',
    speaker: 'dm' as const,
    text: 'A stranger pushes through the door.',
    dmLineKind: 'flavor' as const
  }
]

describe('scene context helpers', () => {
  it('picks the latest scene narration and ignores flavor lines', () => {
    expect(pickCurrentSceneText(ENTRIES)).toBe('Smoke hangs in the rafters.')
  })

  it('falls back to persisted scene text when the log has no scene line', () => {
    expect(
      pickCurrentSceneText(
        [{ id: 'p', timestamp: 't', speaker: 'player', text: 'Hello', playerLineKind: 'raw' }],
        'A rain-slick alley.'
      )
    ).toBe('A rain-slick alley.')
  })

  it('returns null when no scene exists yet', () => {
    expect(pickCurrentSceneText([{ id: 'p', timestamp: 't', speaker: 'player', text: 'Hello' }])).toBeNull()
  })

  it('keeps only DM flavor in the exposition feed', () => {
    expect(filterDmFlavorEntries(ENTRIES)).toEqual([
      expect.objectContaining({ id: '4', text: 'A stranger pushes through the door.' })
    ])
  })

  it('routes player and NPC lines to the conversation feed', () => {
    expect(filterConversationEntries(ENTRIES)).toHaveLength(2)
    expect(filterConversationEntries(ENTRIES).map((entry) => entry.speaker)).toEqual(['player', 'npc'])
  })

  it('includes player action expression in conversation and keeps raw input separate', () => {
    const entries = [
      { id: '1', timestamp: 't1', speaker: 'player' as const, text: 'I draw my sword', playerLineKind: 'raw' as const },
      {
        id: '2',
        timestamp: 't2',
        speaker: 'player' as const,
        text: 'Kael draws his sword.',
        playerLineKind: 'actionExpression' as const
      },
      {
        id: '3',
        timestamp: 't3',
        speaker: 'dm' as const,
        text: 'Steel flashes.',
        dmLineKind: 'flavor' as const
      }
    ]
    expect(filterConversationEntries(entries)).toHaveLength(2)
    expect(filterDmFlavorEntries(entries)).toHaveLength(1)
    expect(filterConversationEntries(entries)[0]?.text).toBe('I draw my sword')
  })
})
