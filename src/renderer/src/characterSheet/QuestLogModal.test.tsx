import { describe, expect, it } from 'vitest'
import type { CharacterQuestView } from '../../../shared/quests/types'
import { groupQuestViews } from './useCharacterQuestLog'

function view(
  id: string,
  kind: 'main' | 'side',
  status: CharacterQuestView['characterQuest']['status']
): CharacterQuestView {
  return {
    quest: {
      id,
      campaignId: 'c1',
      kind,
      title: `${kind} ${id}`,
      summary: 'Summary',
      hookLine: kind === 'main' ? 'Premise hook' : null,
      storyThreadId: null,
      premiseAnchor: null,
      regionId: null,
      sourceWorldFactId: null,
      scale: 'minor',
      objectives: [{ id: 'o1', text: 'Objective', done: false }],
      createdAt: '2020-01-01'
    },
    characterQuest: {
      characterId: 'p1',
      questId: id,
      status,
      acceptedInGameDate: status === 'active' ? 1 : null,
      completedInGameDate: status === 'completed' ? 5 : null,
      playerNotes: null,
      updatedAt: '2020-01-01'
    },
    regionName: null
  }
}

describe('groupQuestViews', () => {
  it('groups main and side quests by status', () => {
    const grouped = groupQuestViews([
      view('main', 'main', 'active'),
      view('side-a', 'side', 'active'),
      view('side-b', 'side', 'available'),
      view('side-c', 'side', 'completed')
    ])
    expect(grouped.main?.quest.id).toBe('main')
    expect(grouped.active.map((row) => row.quest.id)).toEqual(['side-a'])
    expect(grouped.available.map((row) => row.quest.id)).toEqual(['side-b'])
    expect(grouped.completed.map((row) => row.quest.id)).toEqual(['side-c'])
  })
})

describe('QuestLogModal grouping', () => {
  it('supports main story fixtures used by the modal', () => {
    const grouped = groupQuestViews([view('main', 'main', 'active')])
    expect(grouped.main?.quest.kind).toBe('main')
  })
})
