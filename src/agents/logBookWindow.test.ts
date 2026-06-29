import { describe, expect, it } from 'vitest'
import type { LogCategory } from '../shared/logBook/types'
import type { LogEntry } from '../shared/logBook/types'
import {
  LOG_ENTRIES_PER_CATEGORY_LIMIT,
  windowLogEntriesForNarration,
  type LogBookSceneContext
} from './logBookWindow'

function entry(
  id: string,
  input: {
    category: LogCategory
    title: string
    learnedInGameDate: number
    relatedEntityId?: string | null
  }
): LogEntry {
  return {
    id,
    campaignId: 'camp',
    characterId: 'hero',
    category: input.category,
    title: input.title,
    content: `${input.title} notes`,
    relatedEntityId: input.relatedEntityId ?? null,
    learnedInGameDate: input.learnedInGameDate,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
}

describe('windowLogEntriesForNarration', () => {
  const scene: LogBookSceneContext = { regionId: 'region-oak', presentNpcIds: ['npc-mira'] }

  it('returns all entries when under the per-category limit', () => {
    const entries = [
      entry('1', { category: 'place', title: 'Oakhollow', learnedInGameDate: 1, relatedEntityId: 'region-oak' }),
      entry('2', { category: 'person', title: 'Mira', learnedInGameDate: 2, relatedEntityId: 'npc-mira' })
    ]
    expect(windowLogEntriesForNarration(entries, scene)).toEqual(entries)
  })

  it('caps each category at LOG_ENTRIES_PER_CATEGORY_LIMIT', () => {
    const entries = Array.from({ length: 8 }, (_, index) =>
      entry(`e-${index}`, { category: 'event', title: `Event ${index}`, learnedInGameDate: index })
    )
    const windowed = windowLogEntriesForNarration(entries, scene)
    expect(windowed.filter((row) => row.category === 'event')).toHaveLength(LOG_ENTRIES_PER_CATEGORY_LIMIT)
  })

  it('prefers scene-relevant entries over older unrelated ones when capped', () => {
    const entries = [
      entry('old-place', { category: 'place', title: 'Distant ruin', learnedInGameDate: 1, relatedEntityId: 'region-far' }),
      entry('new-place', { category: 'place', title: 'Oakhollow', learnedInGameDate: 2, relatedEntityId: 'region-oak' }),
      ...Array.from({ length: 6 }, (_, index) =>
        entry(`filler-place-${index}`, {
          category: 'place',
          title: `Other ${index}`,
          learnedInGameDate: index,
          relatedEntityId: 'region-far'
        })
      ),
      entry('older-person', { category: 'person', title: 'Stranger', learnedInGameDate: 1, relatedEntityId: 'npc-other' }),
      entry('present-person', { category: 'person', title: 'Mira', learnedInGameDate: 5, relatedEntityId: 'npc-mira' })
    ]
    const windowed = windowLogEntriesForNarration(entries, scene)
    expect(windowed.some((row) => row.id === 'new-place')).toBe(true)
    expect(windowed.some((row) => row.id === 'present-person')).toBe(true)
    expect(windowed.some((row) => row.id === 'old-place')).toBe(false)
  })
})
