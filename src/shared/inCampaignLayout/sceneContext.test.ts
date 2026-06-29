import { describe, expect, it } from 'vitest'
import {
  filterDmExpositionEntries,
  filterPlayerInteractionEntries,
  pickCurrentSceneText
} from './sceneContext'

const ENTRIES = [
  { id: '1', timestamp: 't1', speaker: 'player' as const, text: 'I enter the tavern.' },
  { id: '2', timestamp: 't2', speaker: 'dm' as const, text: 'Smoke hangs in the rafters.' },
  { id: '3', timestamp: 't3', speaker: 'npc' as const, text: 'Welcome, traveler.' },
  { id: '4', timestamp: 't4', speaker: 'dm' as const, text: 'The barkeep slides a mug forward.' }
]

describe('scene context helpers', () => {
  it('picks the latest DM narration as current scene text', () => {
    expect(pickCurrentSceneText(ENTRIES)).toBe('The barkeep slides a mug forward.')
  })

  it('returns null when no DM exposition exists yet', () => {
    expect(pickCurrentSceneText([{ id: 'p', timestamp: 't', speaker: 'player', text: 'Hello' }])).toBeNull()
  })

  it('splits exposition and player interaction feeds', () => {
    expect(filterDmExpositionEntries(ENTRIES)).toHaveLength(3)
    expect(filterPlayerInteractionEntries(ENTRIES)).toHaveLength(1)
  })
})
