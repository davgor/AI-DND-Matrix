import { describe, expect, it } from 'vitest'
import type { RegionExtras } from '../../../main/campaignIpc'
import { CampaignReviewRegionExtras } from './CampaignReviewRegionExtras'
import { EditableFieldEditView, EditableFieldReadView } from './editableFieldViews'
import { RecapBanner } from '../playView/RecapBanner'
import { hasEmphasisTypes } from '../shared/formattedTextTestUtils'

describe('CampaignReviewRegionExtras emphasis rendering', () => {
  it('renders emphasis in backstory, recent history, and quest hooks', () => {
    const extras: RegionExtras = {
      backstory: 'Founded in *ancient* times.',
      recentHistory: 'A **fire** swept the docks.',
      questHooks: ['Find the _lost_ relic']
    }

    const node = CampaignReviewRegionExtras({ extras })
    const sections = node.props.children as JSX.Element[]

    expect(hasEmphasisTypes(sections[0].props.children[1], ['em'])).toBe(true)
    expect(hasEmphasisTypes(sections[1].props.children[1], ['strong'])).toBe(true)
    expect(hasEmphasisTypes(sections[2].props.children[1].props.children[0], ['em'])).toBe(true)
  })
})

describe('EditableField emphasis rendering', () => {
  it('renders emphasis in read state and keeps raw markers in edit state', () => {
    const readNode = EditableFieldReadView({ value: 'A *quiet* village.' })
    expect(hasEmphasisTypes(readNode, ['em'])).toBe(true)

    const editNode = EditableFieldEditView({ value: 'A *quiet* village.', onChange: () => {} })
    expect(editNode.props.value).toBe('A *quiet* village.')
  })
})

describe('RecapBanner emphasis rendering', () => {
  it('renders emphasis markers in recap text', () => {
    const node = RecapBanner({
      recap: {
        visible: true,
        text: 'Previously you *escaped* the **keep**.',
        loading: false,
        open: async () => {},
        show: () => {},
        generate: async () => {},
        skip: () => {},
        view: async () => {}
      }
    })

    const modal = (node?.props.children as JSX.Element).props.children as JSX.Element
    const body = (modal.props.children as JSX.Element[])[1]
    const recapParagraph = body.props.children as JSX.Element
    expect(hasEmphasisTypes(recapParagraph, ['em', 'strong'])).toBe(true)
  })
})
