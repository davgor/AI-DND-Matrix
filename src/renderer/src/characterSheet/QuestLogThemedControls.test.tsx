import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import type { CharacterQuestView } from '../../../shared/quests/types'
import { flattenJsx } from '../playView/askDmTestUtils'
import { findByClassName } from '../raceSelection/raceSelectionTestUtils'
import { QuestAcceptButton, QuestAbandonButton } from './QuestCardActions'
import { QuestLogCard } from './QuestLogSections'

function availableView(): CharacterQuestView {
  return {
    quest: {
      id: 'q1',
      campaignId: 'c1',
      kind: 'side',
      title: 'Valtor Blade',
      summary: 'Recover the blade.',
      hookLine: null,
      storyThreadId: null,
      premiseAnchor: null,
      regionId: null,
      sourceWorldFactId: null,
      scale: 'minor',
      objectives: [
        { id: 'o1', text: 'Clear the thornvines', done: false },
        { id: 'o2', text: 'Deliver the blade', done: true }
      ],
      createdAt: '2020-01-01'
    },
    characterQuest: {
      characterId: 'p1',
      questId: 'q1',
      status: 'available',
      acceptedInGameDate: null,
      completedInGameDate: null,
      playerNotes: null,
      updatedAt: '2020-01-01'
    },
    regionName: null
  }
}

describe('Quest log themed controls', () => {
  it('marks Track quest and Abandon with the shared btn theme class', () => {
    const accept = flattenJsx(QuestAcceptButton({ onAccept: () => {} })) as ReactNode
    const abandon = flattenJsx(QuestAbandonButton({ onAbandon: () => {} })) as ReactNode
    expect(findByClassName(accept, 'btn')).toBeDefined()
    expect(findByClassName(abandon, 'btn')).toBeDefined()
  })

  it('marks objective checkboxes with themed quest-log-check class', () => {
    const tree = flattenJsx(
      QuestLogCard({
        view: availableView(),
        curateMode: false,
        onAccept: () => {}
      })
    ) as ReactNode
    expect(findByClassName(tree, 'quest-log-check')).toBeDefined()
    expect(findByClassName(tree, 'btn')).toBeDefined()
  })
})
