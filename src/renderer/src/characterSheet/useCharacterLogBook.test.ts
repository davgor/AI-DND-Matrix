import { describe, expect, it } from 'vitest'
import { filterLogEntries } from './useCharacterLogBook'
import type { LogEntry } from '../../../shared/logBook/types'

const sample: LogEntry[] = [
  {
    id: '1',
    campaignId: 'c',
    characterId: 'h',
    category: 'place',
    title: 'Oakhollow',
    content: 'A village.',
    relatedEntityId: null,
    learnedInGameDate: 1,
    createdAt: 't'
  },
  {
    id: '2',
    campaignId: 'c',
    characterId: 'h',
    category: 'person',
    title: 'Mira',
    content: 'Shopkeeper.',
    relatedEntityId: null,
    learnedInGameDate: 2,
    createdAt: 't'
  }
]

describe('filterLogEntries', () => {
  it('filters by search query client-side', () => {
    expect(filterLogEntries(sample, 'mira', 'all')).toHaveLength(1)
  })

  it('filters by category chip', () => {
    expect(filterLogEntries(sample, '', 'place')).toHaveLength(1)
  })
})
