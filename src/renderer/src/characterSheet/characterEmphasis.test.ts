import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../../../shared/logBook/types'
import { FormattedText } from '../shared/FormattedText'
import { hasEmphasisTypes } from '../shared/formattedTextTestUtils'
import { CharacterLogBookSections } from './CharacterLogBookSections'

describe('CharacterJournalSection emphasis rendering', () => {
  it('renders emphasis markers in journal entry content', () => {
    const node = FormattedText({ as: 'p', text: 'Met a *stranger* at the **crossroads**.' })
    expect(hasEmphasisTypes(node, ['em', 'strong'])).toBe(true)
  })
})

describe('CharacterLogBookSections emphasis rendering', () => {
  it('renders emphasis markers in log book entry content', () => {
    const entries: LogEntry[] = [
      {
        id: 'log-1',
        campaignId: 'camp-1',
        characterId: 'char-1',
        category: 'event',
        title: 'The ambush',
        content: 'We fled through *smoke* and **fire**.',
        learnedInGameDate: 3,
        relatedEntityId: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ]

    const node = CharacterLogBookSections({ entries })
    const eventSection = (node.props.children as JSX.Element[])[0]
    const list = eventSection.props.children[1] as JSX.Element
    const listItem = list.props.children[0] as JSX.Element
    const entryParagraph = listItem.props.children[1] as JSX.Element

    expect(hasEmphasisTypes(entryParagraph, ['em', 'strong'])).toBe(true)
  })

  it('leaves empty-state copy unchanged', () => {
    const node = CharacterLogBookSections({ entries: [] })
    const eventSection = (node.props.children as JSX.Element[])[0]
    const emptyCopy = eventSection.props.children[1] as JSX.Element
    expect(emptyCopy.props.className).toBe('character-sheet-empty')
  })
})
