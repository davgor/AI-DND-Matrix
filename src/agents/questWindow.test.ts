import { describe, expect, it } from 'vitest'
import type { Quest } from '../shared/quests/types'
import type { CharacterQuest } from '../shared/quests/types'
import { MAX_ACTIVE_QUESTS_IN_CONTEXT } from '../shared/quests/types'
import { windowActiveQuestsForNarration } from './questWindow'

function quest(id: string, kind: Quest['kind']): Quest {
  return {
    id,
    campaignId: 'c1',
    kind,
    title: id,
    summary: `${id} summary`,
    hookLine: kind === 'main' ? 'hook' : null,
    storyThreadId: null,
    premiseAnchor: null,
    regionId: null,
    sourceWorldFactId: null,
    scale: 'minor',
    objectives: [{ id: 'o1', text: 'Do it', done: false }],
    createdAt: '2020-01-01'
  }
}

function membership(questId: string, status: CharacterQuest['status'], accepted: number): CharacterQuest {
  return {
    characterId: 'p1',
    questId,
    status,
    acceptedInGameDate: accepted,
    completedInGameDate: null,
    playerNotes: null,
    updatedAt: '2020-01-01'
  }
}

describe('windowActiveQuestsForNarration', () => {
  it('includes only active quests and respects the bound', () => {
    const quests = [
      quest('main', 'main'),
      quest('s1', 'side'),
      quest('s2', 'side'),
      quest('s3', 'side'),
      quest('s4', 'side'),
      quest('avail', 'side')
    ]
    const rows = [
      membership('main', 'active', 0),
      membership('s1', 'active', 4),
      membership('s2', 'active', 3),
      membership('s3', 'active', 2),
      membership('s4', 'active', 1),
      membership('avail', 'available', 0)
    ]
    const windowed = windowActiveQuestsForNarration(quests, rows, MAX_ACTIVE_QUESTS_IN_CONTEXT)
    expect(windowed).toHaveLength(3)
    expect(windowed[0]?.kind).toBe('main')
    expect(windowed.map((q) => q.id)).toEqual(['main', 's1', 's2'])
  })

  it('returns empty when no active quests', () => {
    expect(windowActiveQuestsForNarration([], [])).toEqual([])
  })
})
