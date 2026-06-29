import { describe, expect, it } from 'vitest'
import { tokenizeTextEmphasis } from '../../../shared/textEmphasis'
import { FormattedText } from '../shared/FormattedText'
import { hasEmphasisTypes } from '../shared/formattedTextTestUtils'
import { CampaignReviewRegionExtras } from '../campaignReview/CampaignReviewRegionExtras'
import { EditableFieldReadView } from '../campaignReview/editableFieldViews'
import { CharacterLogBookSections } from '../characterSheet/CharacterLogBookSections'
import { RecapBanner } from '../playView/RecapBanner'
import { renderNpcLine } from '../playView/dmExpositionParts'
import type { LogEntry } from '../../../shared/logBook/types'
import type { RegionExtras } from '../../../main/campaignIpc'
import { expectEmphasisGuidanceInPrompts } from './emphasisSmokePrompts'

describe('emphasis formatting smoke: exposition', () => {
  it('renders DM exposition scene narration with emphasis markers', () => {
    const node = FormattedText({
      as: 'p',
      className: 'dm-exposition-scene-text',
      text: 'The *wind* howls and **thunder** rolls.'
    })
    expect(hasEmphasisTypes(node, ['em', 'strong'])).toBe(true)
    expect(tokenizeTextEmphasis('The *wind* howls and **thunder** rolls.')).toHaveLength(5)
  })

  it('keeps 028.7 reactionKind rendering when text has no inline emphasis', () => {
    const dialogue = renderNpcLine({ reactionKind: 'dialogue', text: 'Hello.' })
    const action = renderNpcLine({ reactionKind: 'action', text: 'The wolf lunges.' })

    expect(dialogue.type).toBe('em')
    expect(action.type).toBe('strong')
    expect((dialogue.props.children as JSX.Element).props.children).toEqual(['Hello.'])
  })
})

describe('emphasis formatting smoke: narrative surfaces', () => {
  it('renders journal-style text with emphasis markers', () => {
    const journalNode = FormattedText({ as: 'p', text: 'Met a *stranger* at the **crossroads**.' })
    expect(hasEmphasisTypes(journalNode, ['em', 'strong'])).toBe(true)
  })

  it('renders log book entries with emphasis markers', () => {
    const logEntry: LogEntry = {
      id: 'log-1',
      campaignId: 'camp-1',
      characterId: 'char-1',
      category: 'event',
      title: 'Ambush',
      content: 'We fled through *smoke* and **fire**.',
      learnedInGameDate: 1,
      relatedEntityId: null,
      createdAt: '2026-01-01T00:00:00.000Z'
    }
    const logBookNode = CharacterLogBookSections({ entries: [logEntry] })
    const logSection = (logBookNode.props.children as JSX.Element[])[0]
    const logParagraph = (logSection.props.children[1] as JSX.Element).props.children[0]
      .props.children[1] as JSX.Element
    expect(hasEmphasisTypes(logParagraph, ['em', 'strong'])).toBe(true)
  })

  it('renders campaign review and editable read surfaces with emphasis markers', () => {
    const extras: RegionExtras = {
      backstory: 'Founded in *ancient* times.',
      recentHistory: 'A **fire** swept the docks.',
      questHooks: ['Find the _lost_ relic']
    }
    const reviewNode = CampaignReviewRegionExtras({ extras })
    const reviewSections = reviewNode.props.children as JSX.Element[]
    expect(hasEmphasisTypes(reviewSections[0].props.children[1], ['em'])).toBe(true)
    expect(hasEmphasisTypes(reviewSections[1].props.children[1], ['strong'])).toBe(true)
    expect(hasEmphasisTypes(EditableFieldReadView({ value: '*Friendly* and **hostile**.' }), ['em', 'strong'])).toBe(
      true
    )
  })

  it('renders recap banner text with emphasis markers', () => {
    const recapNode = RecapBanner({
      recap: {
        visible: true,
        text: 'Previously you *escaped* the **keep**.',
        loading: false,
        skip: () => {},
        view: async () => {}
      }
    })
    expect(hasEmphasisTypes(recapNode?.props.children[0] as JSX.Element, ['em', 'strong'])).toBe(true)
  })
})

describe('emphasis formatting smoke: agent prompts', () => {
  it('includes emphasis guidance in DM and NPC prompts', async () => {
    await expectEmphasisGuidanceInPrompts()
  })
})
